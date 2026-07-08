from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.common.middleware.rate_limit import RateLimited
from deploypilot.core.database import get_db
from deploypilot.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    _: None = RateLimited,
):
    svc = AuthService(db)
    user = await svc.register(
        email=body.email,
        username=body.username,
        display_name=body.display_name,
        password=body.password,
    )
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
    _: None = RateLimited,
):
    svc = AuthService(db)
    return await svc.login(email=body.email, password=body.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    return await svc.refresh(body.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    return current_user


@router.get("/github/callback", response_model=TokenResponse)
async def github_oauth_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    return await svc.github_oauth_callback(code)
