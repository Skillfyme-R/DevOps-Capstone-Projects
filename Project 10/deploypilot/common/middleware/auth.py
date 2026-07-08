"""
FastAPI dependency: resolve the current authenticated user from a JWT or API key.
"""
import hashlib
from typing import Annotated, Optional
import uuid

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import UnauthorizedError, ForbiddenError
from deploypilot.core.database import get_db
from deploypilot.core.security import decode_token, verify_api_key
from deploypilot.models.user import ApiKey, User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Resolves the caller identity from:
      1. Bearer JWT token
      2. API key in X-API-Key header
    """
    # ── Try API key first ────────────────────────────────────────────────────
    api_key_header: Optional[str] = request.headers.get("X-API-Key")
    if api_key_header:
        key_hash = hashlib.sha256(api_key_header.encode()).hexdigest()
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active.is_(True),
            )
        )
        api_key = result.scalar_one_or_none()
        if not api_key:
            raise UnauthorizedError("Invalid API key")

        user_result = await db.execute(
            select(User).where(User.id == api_key.user_id, User.deleted_at.is_(None))
        )
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active:
            raise UnauthorizedError("API key owner not found or disabled")
        return user

    # ── Try Bearer JWT ────────────────────────────────────────────────────────
    if not credentials:
        raise UnauthorizedError("No authentication credentials provided")

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise UnauthorizedError("Invalid or expired token")

    if payload.get("typ") != "access":
        raise UnauthorizedError("Expected an access token")

    user_result = await db.execute(
        select(User).where(
            User.id == uuid.UUID(payload["sub"]),
            User.deleted_at.is_(None),
        )
    )
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or disabled")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole):
    """Dependency factory: gate a route to users with any of the given roles."""
    async def _check(user: CurrentUser) -> User:
        if user.role not in roles:
            raise ForbiddenError(f"Requires one of: {[r.value for r in roles]}")
        return user
    return _check


RequireSuperAdmin = Depends(require_role(UserRole.SUPER_ADMIN))
