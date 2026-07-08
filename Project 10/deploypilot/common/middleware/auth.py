"""Authentication dependency — resolves the current user from JWT or API key."""

import hashlib
import uuid
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.core.database import get_db
from deploypilot.core.security import decode_token
from deploypilot.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current authenticated user from JWT Bearer or X-API-Key header."""
    # --- API key path ---
    api_key = request.headers.get("X-API-Key")
    if api_key:
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        result = await db.execute(
            text("SELECT user_id FROM api_keys WHERE key_hash = :h AND is_active = TRUE"),
            {"h": key_hash},
        )
        row = result.fetchone()
        if row:
            user = await db.get(User, row[0])
            if user and user.is_active:
                return user
        raise HTTPException(status_code=401, detail="Invalid API key")

    # --- JWT Bearer path ---
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id or payload.get("typ") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = await db.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
