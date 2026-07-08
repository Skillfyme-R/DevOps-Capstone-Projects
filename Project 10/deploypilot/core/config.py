"""
Application configuration — loaded from environment variables with sensible defaults.
Uses pydantic-settings so every field is type-checked and validated at startup.
"""
from functools import lru_cache
from typing import List, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ─────────────────────────────────────────────────────────
    APP_NAME: str = "DeployPilot"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"          # development | staging | production
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-256-bit-random"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://deploypilot:deploypilot@localhost:5432/deploypilot"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── GitHub Integration ───────────────────────────────────────────────────
    GITHUB_APP_ID: Optional[str] = None
    GITHUB_APP_PRIVATE_KEY: Optional[str] = None
    GITHUB_WEBHOOK_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None

    # ── AWS ──────────────────────────────────────────────────────────────────
    AWS_REGION: str = "us-east-1"
    AWS_SECRETS_MANAGER_PREFIX: str = "deploypilot"

    # ── Terraform ────────────────────────────────────────────────────────────
    TERRAFORM_BINARY_PATH: str = "/usr/local/bin/terraform"
    TERRAFORM_WORKING_DIR: str = "/tmp/deploypilot/runs"
    TERRAFORM_STATE_BUCKET: Optional[str] = None

    # ── Notifications ────────────────────────────────────────────────────────
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_ADDRESS: str = "no-reply@deploypilot.io"
    SLACK_DEFAULT_WEBHOOK: Optional[str] = None

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # ── Observability ────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"             # json | text
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_ENABLED: bool = True
    PROMETHEUS_PORT: int = 9090

    # ── Storage ──────────────────────────────────────────────────────────────
    S3_BUCKET_ARTIFACTS: Optional[str] = None
    S3_BUCKET_LOGS: Optional[str] = None

    # ── Admin ────────────────────────────────────────────────────────────────
    INITIAL_ADMIN_EMAIL: Optional[str] = None
    INITIAL_ADMIN_PASSWORD: Optional[str] = None

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}")
        return v

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
