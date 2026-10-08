from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.base import EmailAddress


class RegisterIn(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailAddress
    password: str = Field(..., min_length=6, max_length=128)
    phone: str | None = Field(None, max_length=30)
    role: str = Field(default="patient", pattern="^(patient|doctor|hospital)$")


class LoginIn(BaseModel):
    email: EmailAddress
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailAddress
    phone: str | None = None
    role: str
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
