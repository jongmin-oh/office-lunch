import os
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from uuid import UUID

import boto3
import jwt
from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models import User

GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"]
TOKEN_TTL = timedelta(days=30)


@lru_cache
def _google_jwks() -> jwt.PyJWKClient:
    return jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs")


@lru_cache
def _jwt_secret() -> str:
    resp = boto3.client("ssm").get_parameter(Name=os.environ["JWT_SECRET_PARAM"], WithDecryption=True)
    return resp["Parameter"]["Value"]


def _unauthorized() -> HTTPException:
    return HTTPException(status_code=401, detail="Invalid token")


def _verify_google_token(id_token: str) -> dict:
    try:
        key = _google_jwks().get_signing_key_from_jwt(id_token).key
        return jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=os.environ["GOOGLE_WEB_CLIENT_ID"],
            issuer=GOOGLE_ISSUERS,
            options={"require": ["exp", "iss", "aud", "sub", "email"]},
        )
    except jwt.PyJWTError as e:
        raise _unauthorized() from e


def _upsert_user(session: Session, google_sub: str, email: str, name: str) -> User:
    stmt = (
        insert(User)
        .values(google_sub=google_sub, email=email, name=name)
        .on_conflict_do_update(index_elements=[User.google_sub], set_={"email": email, "name": name})
        .returning(User)
    )
    user = session.scalars(stmt).one()
    session.commit()
    return user


def login_with_google(session: Session, id_token: str) -> tuple[str, User]:
    claims = _verify_google_token(id_token)
    user = _upsert_user(session, claims["sub"], claims["email"], claims.get("name", ""))
    exp = datetime.now(UTC) + TOKEN_TTL
    token = jwt.encode({"sub": str(user.id), "exp": exp}, _jwt_secret(), algorithm="HS256")
    return token, user


def get_user_by_token(session: Session, access_token: str) -> User:
    try:
        claims = jwt.decode(
            access_token,
            _jwt_secret(),
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as e:
        raise _unauthorized() from e
    user = session.get(User, UUID(claims["sub"]))
    if user is None:
        raise _unauthorized()
    return user
