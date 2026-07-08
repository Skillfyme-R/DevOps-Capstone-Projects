"""Authentication service — registration, login, token refresh."""

from typing import Optional

from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import ConflictError, UnauthorizedError
from deploypilot.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from deploypilot.models.user import User


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(
        self,
        email: str,
        username: str,
        display_name: str,
        password: str,
    ) -> dict:
        """Create a new user and return a token pair."""
        if await self._get_by_email(email):
            raise ConflictError("A user with this email already exists")
        if await self._get_by_username(username):
            raise ConflictError("A user with this username already exists")

        user = User(
            email=email.lower().strip(),
            username=username.lower().strip(),
            display_name=display_name.strip(),
            hashed_password=hash_password(password),
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)

        return {
            "access_token": create_access_token(str(user.id)),
            "refresh_token": create_refresh_token(str(user.id)),
            "token_type": "bearer",
        }

    async def login(self, email: str, password: str) -> dict:
        """Verify credentials and return a token pair."""
        user = await self._get_by_email(email)
        if not user or not user.hashed_password:
            raise UnauthorizedError("Invalid email or password")
        if not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")

        return {
            "access_token": create_access_token(str(user.id)),
            "refresh_token": create_refresh_token(str(user.id)),
            "token_type": "bearer",
        }

    async def refresh_token(self, token: str) -> dict:
        """Exchange a refresh token for a new token pair."""
        try:
            payload = decode_token(token)
        except JWTError:
            raise UnauthorizedError("Invalid or expired refresh token")

        if payload.get("typ") != "refresh":
            raise UnauthorizedError("Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Malformed token")

        return {
            "access_token": create_access_token(user_id),
            "refresh_token": create_refresh_token(user_id),
            "token_type": "bearer",
        }

    async def _get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def _get_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.username == username.lower().strip())
        )
        return result.scalar_one_or_none()
