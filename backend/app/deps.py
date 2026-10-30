from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.services import auth
from app.services.db import SessionLocal, get_engine

bearer = HTTPBearer()


def get_session() -> Iterator[Session]:
    with SessionLocal(bind=get_engine()) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)], session: SessionDep
) -> models.User:
    return auth.get_user_by_token(session, credentials.credentials)


CurrentUser = Annotated[models.User, Depends(current_user)]
