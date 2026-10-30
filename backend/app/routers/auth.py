from fastapi import APIRouter

from app import models
from app.deps import CurrentUser, SessionDep
from app.schemas.auth import GoogleLoginRequest, LoginResponse, User
from app.services import auth

router = APIRouter()


@router.post(
    "/auth/google",
    response_model=LoginResponse,
    responses={401: {"description": "Invalid Google ID token"}},
)
def login_google(body: GoogleLoginRequest, session: SessionDep) -> LoginResponse:
    token, user = auth.login_with_google(session, body.id_token)
    return LoginResponse(access_token=token, user=User.model_validate(user))


@router.get(
    "/me",
    response_model=User,
    responses={401: {"description": "Missing or invalid access token"}},
)
def me(user: CurrentUser) -> models.User:
    return user
