"""
Authentication service: registration, login, token refresh, GitHub OAuth.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

import httpx
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import (
    ConflictError,
    NotFoundError,
    UnauthorizedError,
)
from deploypilot.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from deploypilot.core.config import settings
from deploypilot.core.logging import get_logger
from deploypilot.models.user import User, UserRole
from deploypilot.modules.audit.service import AuditService

log = get_logger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._audit = AuditService(db)

    async def register(
        self,
        email: str,
        username: str,
        display_name: str,
        password: str,
    ) -> User:
        existing = await self._get_by_email(email)
        if existing:
            raise ConflictError(f"Email '{email}' is already registered")

        existing_username = await self._get_by_username(username)
        if existing_username:
            raise ConflictError(f"Username '{username}' is already taken")

        user = User(
            email=email.lower().strip(),
            username=username.lower().strip(),
            display_name=display_name,
            hashed_password=hash_password(password),
            role=UserRole.MEMBER,
        )
        self.db.add(user)
        await self.db.flush()

        await self._audit.record(
            action="user.registered",
            resource_type="user",
            resource_id=str(user.id),
            actor_id=str(user.id),
        )
        log.info("user_registered", user_id=str(user.id), email=email)
        return user

    async def login(self, email: str, password: str) -> dict:
        user = await self._get_by_email(email)
        if not user or not user.hashed_password:
            raise UnauthorizedError("Invalid credentials")
        if not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid credentials")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        tokens = self._issue_tokens(user)
        await self._audit.record(
            action="user.login",
            resource_type="user",
            resource_id=str(user.id),
            actor_id=str(user.id),
        )
        return tokens

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise UnauthorizedError("Invalid or expired refresh token")

        if payload.get("typ") != "refresh":
            raise UnauthorizedError("Not a refresh token")

        user = await self._get_by_id(payload["sub"])
        if not user or not user.is_active:
            raise UnauthorizedError("User not found or disabled")

        return self._issue_tokens(user)

    async def github_oauth_callback(self, code: str) -> dict:
        """Exchange GitHub OAuth code for a DeployPilot session."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            gh_data = resp.json()

        gh_token = gh_data.get("access_token")
        if not gh_token:
            raise UnauthorizedError("GitHub OAuth failed — no access token")

        async with httpx.AsyncClient() as client:
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {gh_token}"},
            )
            user_resp.raise_for_status()
            gh_user = user_resp.json()

        user = await self._get_by_github_id(str(gh_user["id"]))
        if not user:
            # auto-provision a new account
            user = User(
                email=gh_user.get("email") or f"{gh_user['login']}@github.noreply",
                username=gh_user["login"],
                display_name=gh_user.get("name") or gh_user["login"],
                avatar_url=gh_user.get("avatar_url"),
                github_user_id=str(gh_user["id"]),
                github_username=gh_user["login"],
                github_access_token=gh_token,
                is_email_verified=True,
            )
            self.db.add(user)
            await self.db.flush()
        else:
            user.github_access_token = gh_token
            user.last_login_at = datetime.now(timezone.utc)
            await self.db.flush()

        return self._issue_tokens(user)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _issue_tokens(self, user: User) -> dict:
        extra = {"role": user.role.value, "email": user.email}
        return {
            "access_token": create_access_token(str(user.id), extra),
            "refresh_token": create_refresh_token(str(user.id)),
            "token_type": "bearer",
        }

    async def _get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip(), User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def _get_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.username == username.lower().strip(), User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def _get_by_id(self, user_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.id == uuid.UUID(user_id), User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def _get_by_github_id(self, github_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.github_user_id == github_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()
