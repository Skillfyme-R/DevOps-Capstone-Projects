from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    display_name: str
    password: str

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9][a-z0-9_-]{2,39}$", v.lower()):
            raise ValueError(
                "Username must be 3-40 characters, start with a letter/number, "
                "and contain only letters, numbers, hyphens, or underscores"
            )
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    display_name: str
    role: str
    avatar_url: Optional[str] = None
    is_email_verified: bool

    model_config = {"from_attributes": True}
