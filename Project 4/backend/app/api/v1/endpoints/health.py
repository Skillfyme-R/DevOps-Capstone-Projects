from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()
router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get("/ready", response_model=HealthResponse)
async def readiness_check() -> HealthResponse:
    return HealthResponse(
        status="ready",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
