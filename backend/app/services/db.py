import os
from functools import cache

import certifi
from aurora_dsql_sqlalchemy import create_dsql_engine
from sqlalchemy import Engine
from sqlalchemy.orm import sessionmaker


def create_db_engine(dsql_endpoint: str | None = None) -> Engine:
    return create_dsql_engine(
        host=dsql_endpoint or os.environ["DSQL_ENDPOINT"],
        user="admin",
        # psycopg[binary]에 번들된 OpenSSL은 시스템 CA 경로를 찾지 못해 기본값 sslrootcert=system이 실패한다.
        sslrootcert=certifi.where(),
        pool_pre_ping=True,
        # DSQL 연결은 최대 1시간이라 그 전에 교체한다. IAM 토큰은 커넥터가 새 연결마다 발급한다.
        pool_recycle=30 * 60,
    )


@cache
def get_engine() -> Engine:
    return create_db_engine()


# 커밋 후에도 응답 직렬화에 쓸 값이 남도록 만료하지 않는다(INSERT 기본값은 RETURNING으로 채워진다).
SessionLocal = sessionmaker(expire_on_commit=False)
