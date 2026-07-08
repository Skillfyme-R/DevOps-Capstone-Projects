"""
Security utilities: password hashing, JWT creation/verification, API key generation.
"""
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt

from deploypilot.core.config import settings


# ── Password hashing ─────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT tokens ───────────────────────────────────────────────────────────────

def _build_token(
    subject: str,
    token_type: str,
    extra_claims: dict[str, Any],
    expire_delta: timedelta,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "typ": token_type,
        "iat": now,
        "exp": now + expire_delta,
        "jti": str(uuid.uuid4()),
        **extra_claims,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, extra: Optional[dict] = None) -> str:
    return _build_token(
        subject=user_id,
        token_type="access",
        extra_claims=extra or {},
        expire_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    return _build_token(
        subject=user_id,
        token_type="refresh",
        extra_claims={},
        expire_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    """Raises JWTError if the token is invalid or expired."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


# ── API keys ─────────────────────────────────────────────────────────────────

API_KEY_PREFIX = "dp_"


def generate_api_key() -> tuple[str, str]:
    """
    Returns (raw_key, hashed_key).
    Store only the hashed_key; send raw_key to the user once.
    """
    raw = API_KEY_PREFIX + secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def verify_api_key(raw: str, stored_hash: str) -> bool:
    computed = hashlib.sha256(raw.encode()).hexdigest()
    return hmac.compare_digest(computed, stored_hash)


# ── Webhook signatures ────────────────────────────────────────────────────────

def verify_github_webhook(payload: bytes, signature_header: str) -> bool:
    if not settings.GITHUB_WEBHOOK_SECRET:
        return False
    expected = "sha256=" + hmac.new(
        settings.GITHUB_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
