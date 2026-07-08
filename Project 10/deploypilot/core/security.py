"""Security utilities: password hashing, JWT tokens, API keys, HMAC webhook verification."""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt  # noqa: F401

from deploypilot.core.config import settings


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain-text password against its bcrypt hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _build_token(
    subject: str,
    token_type: str,
    extra_claims: dict,
    expire_delta: timedelta,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "typ": token_type,
        "iat": now,
        "exp": now + expire_delta,
        "jti": str(uuid.uuid4()),
        **extra_claims,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, extra: Optional[dict] = None) -> str:
    """Create a short-lived JWT access token."""
    return _build_token(
        user_id,
        "access",
        extra or {},
        timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived JWT refresh token."""
    return _build_token(
        user_id,
        "refresh",
        {},
        timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT token, raising JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


API_KEY_PREFIX = "dp_"


def generate_api_key() -> tuple[str, str]:
    """
    Generate a new API key.

    Returns (raw_key, hashed_key). Store only the hash; return the raw key once to the user.
    """
    raw = API_KEY_PREFIX + secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def verify_api_key(raw: str, stored_hash: str) -> bool:
    """Constant-time comparison of an API key against its stored SHA-256 hash."""
    computed = hashlib.sha256(raw.encode()).hexdigest()
    return hmac.compare_digest(computed, stored_hash)


def verify_github_webhook(payload: bytes, signature_header: str) -> bool:
    """Verify a GitHub webhook payload against the configured secret."""
    if not settings.GITHUB_WEBHOOK_SECRET:
        return False
    expected = (
        "sha256="
        + hmac.new(
            settings.GITHUB_WEBHOOK_SECRET.encode(), payload, hashlib.sha256
        ).hexdigest()
    )
    return hmac.compare_digest(expected, signature_header)
