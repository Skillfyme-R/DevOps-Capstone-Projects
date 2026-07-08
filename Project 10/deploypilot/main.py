"""
DeployPilot API — main FastAPI application.

Start: uvicorn deploypilot.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from deploypilot.core.config import settings
from deploypilot.core.database import engine
from deploypilot.core.logging import configure_logging
from deploypilot.core.redis import close_redis
from deploypilot.common.middleware.request_id import RequestIDMiddleware
from deploypilot.monitoring.health import router as health_router
from deploypilot.monitoring.metrics import setup_metrics
from deploypilot.api.v1.routes.auth import router as auth_router
from deploypilot.api.v1.routes.organizations import router as org_router
from deploypilot.api.v1.routes.workspaces import router as workspace_router
from deploypilot.api.v1.routes.runs import router as runs_router
from deploypilot.api.v1.routes.webhooks import router as webhook_router
from deploypilot.api.v1.routes.audit import router as audit_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    yield
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="DeployPilot API",
    description=(
        "Cloud Infrastructure Automation Platform by CloudForge Technologies. "
        "Manage Terraform workflows, collaborate on infrastructure changes, "
        "and automate deployments with PR-driven GitOps."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Metrics (Prometheus) ──────────────────────────────────────────────────────

if settings.PROMETHEUS_ENABLED:
    setup_metrics(app)

# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(org_router, prefix="/api/v1")
app.include_router(workspace_router, prefix="/api/v1")
app.include_router(runs_router, prefix="/api/v1")
app.include_router(webhook_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root():
    return {"service": settings.APP_NAME, "version": settings.APP_VERSION}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    import traceback
    from deploypilot.core.logging import get_logger
    log = get_logger(__name__)
    log.error("unhandled_exception", path=str(request.url), error=str(exc), tb=traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
