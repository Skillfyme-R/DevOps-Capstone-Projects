from fastapi import APIRouter
from sqlalchemy import text

from deploypilot.core.database import SessionLocal
from deploypilot.core.redis import get_redis
from deploypilot.core.logging import get_logger

router = APIRouter(prefix="/health", tags=["Health"])
log = get_logger(__name__)


@router.get("/live", include_in_schema=False)
async def liveness():
    return {"status": "ok"}


@router.get("/ready")
async def readiness():
    checks: dict = {"database": "unknown", "redis": "unknown"}
    healthy = True

    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        log.error("healthcheck_db_failed", error=str(exc))
        checks["database"] = "error"
        healthy = False

    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        log.error("healthcheck_redis_failed", error=str(exc))
        checks["redis"] = "error"
        healthy = False

    status_code = 200 if healthy else 503
    return checks, status_code
