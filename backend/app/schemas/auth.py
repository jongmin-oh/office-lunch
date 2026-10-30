from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict


class GoogleLoginRequest(BaseModel):
    id_token: str


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # DB의 UUID를 API 계약(문자열)대로 내보낸다.
    id: Annotated[str, BeforeValidator(str)]
    email: str
    name: str


class LoginResponse(BaseModel):
    access_token: str
    user: User
