from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import Organization, User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.core.config import get_settings
from slugify import slugify  # type: ignore[import-untyped]

settings = get_settings()


class AuthenticationError(Exception):
    pass


class DuplicateEmailError(Exception):
    pass


async def register_user(db: AsyncSession, req: RegisterRequest) -> User:
    existing = await db.scalar(select(User).where(User.email == req.email))
    if existing:
        raise DuplicateEmailError("An account with this email already exists.")

    org_slug = slugify(req.organization_name)
    suffix = 0
    base_slug = org_slug
    while await db.scalar(select(Organization).where(Organization.slug == org_slug)):
        suffix += 1
        org_slug = f"{base_slug}-{suffix}"

    org = Organization(name=req.organization_name, slug=org_slug)
    db.add(org)
    await db.flush()

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role=UserRole.OWNER,
        organization_id=org.id,
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, req: LoginRequest) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == req.email))
    if not user or not verify_password(req.password, user.hashed_password):
        raise AuthenticationError("Invalid email or password.")
    if not user.is_active:
        raise AuthenticationError("Account is disabled. Contact your administrator.")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
