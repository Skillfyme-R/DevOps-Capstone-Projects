"""Workspace model."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class Workspace(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "workspaces"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column()
    cloud_provider: Mapped[str] = mapped_column(String(30), default="aws", nullable=False)
    aws_region: Mapped[Optional[str]] = mapped_column(String(30))
    aws_account_id: Mapped[Optional[str]] = mapped_column(String(20))
    terraform_version: Mapped[str] = mapped_column(String(20), default="1.6.0", nullable=False)
    auto_apply: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lock_reason: Mapped[Optional[str]] = mapped_column()
    state_backend: Mapped[str] = mapped_column(String(30), default="s3", nullable=False)
    state_config: Mapped[Optional[str]] = mapped_column()
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
