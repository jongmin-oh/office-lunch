import logging
import tomllib
from logging.config import fileConfig
from pathlib import Path

import boto3
from alembic import context
from alembic.ddl.postgresql import PostgresqlImpl
from alembic.script import ScriptDirectory
from alembic.util import CommandError
from botocore.exceptions import ClientError
from sqlalchemy import Engine

from app.models import Base
from app.services.db import create_db_engine

SAMCONFIG = Path(__file__).resolve().parents[1] / "samconfig.toml"

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)


class AuroraDSQLImpl(PostgresqlImpl):
    # Alembic은 auroradsql 방언을 모르므로 Postgres 구현을 쓰되, DSQL에는 트랜잭션 DDL이 없다.
    __dialect__ = "auroradsql"
    transactional_ddl = False


def deployed_dsql_endpoint() -> str | None:
    params = tomllib.loads(SAMCONFIG.read_text())["default"]["deploy"]["parameters"]
    stack = params["stack_name"]
    cloudformation = boto3.client("cloudformation", region_name=params["region"])
    try:
        stacks = cloudformation.describe_stacks(StackName=stack)["Stacks"]
    except ClientError as e:
        if "does not exist" not in e.response["Error"]["Message"]:
            raise
        if context.get_x_argument(as_dictionary=True).get("allow_missing_stack") == "true":
            return None
        raise CommandError(
            f"스택 {stack}이(가) 없습니다. 첫 배포 전 실행이면 -x allow_missing_stack=true를 붙이세요"
        ) from e
    endpoint = next((o["OutputValue"] for o in stacks[0].get("Outputs", []) if o["OutputKey"] == "DsqlEndpoint"), None)
    if not endpoint:
        raise CommandError(
            f"스택 {stack}에 DsqlEndpoint 출력이 없습니다. 배포가 실패했을 수 있습니다(samconfig의 disable_rollback=true는 실패한 스택을 남깁니다. 스택 이벤트 확인)"
        )
    return endpoint


def target_engine() -> Engine | None:
    if not (endpoint := deployed_dsql_endpoint()):
        return None
    engine = create_db_engine(endpoint)
    logging.getLogger("alembic").info("Target %s", engine.url)
    return engine


def number_revisions(context, revision, directives) -> None:
    """autogenerate 리비전 ID를 0001, 0002 순번으로 매겨 파일이 순서대로 읽히게 합니다."""
    head = ScriptDirectory.from_config(config).get_current_head()
    directives[0].rev_id = f"{int(head) + 1:04d}" if head else "0001"


engine = target_engine()
if engine is None:
    print("alembic: 스택이 아직 없어 건너뜁니다 (allow_missing_stack, 첫 배포)")
elif context.is_offline_mode():
    context.configure(url=engine.url, target_metadata=Base.metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    # DSQL은 한 트랜잭션에 DDL 1개만, DDL과 DML을 섞지 않으므로 문장마다 커밋한다(버전 테이블 기록 포함).
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        context.configure(
            connection=connection, target_metadata=Base.metadata, process_revision_directives=number_revisions
        )
        with context.begin_transaction():
            context.run_migrations()
