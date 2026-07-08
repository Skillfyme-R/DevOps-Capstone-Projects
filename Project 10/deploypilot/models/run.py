"""InfrastructureRun model."""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class RunStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PLANNING = "planning"
    PLAN_COMPLETE = "plan_complete"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    APPLYING = "applying"
    APPLIED = "applied"
    DESTROYING = "destroying"
    DESTROYED = "destroyed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    DISCARDED = "discarded"


class RunTrigger(str, Enum):
    MANUAL = "manual"
    VCS_PUSH = "vcs_push"
    PULL_REQUEST = "pull_request"
    SCHEDULE = "schedule"
    API = "api"


class InfrastructureRun(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "infrastructure_runs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    triggered_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    status: Mapped[RunStatus] = mapped_column(
        SAEnum(RunStatus, name="run_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=RunStatus.PENDING,
        nullable=False,
        index=True,
    )
    trigger: Mapped[RunTrigger] = mapped_column(
        SAEnum(RunTrigger, name="run_trigger_enum", values_callable=lambda x: [e.value for e in x]),
        default=RunTrigger.MANUAL,
        nullable=False,
    )
    commit_sha: Mapped[Optional[str]] = mapped_column(String(40))
    branch: Mapped[Optional[str]] = mapped_column(String(200))
    pr_number: Mapped[Optional[int]] = mapped_column(Integer)
    pr_url: Mapped[Optional[str]] = mapped_column(String(500))
    plan_output: Mapped[Optional[str]] = mapped_column(Text)
    apply_output: Mapped[Optional[str]] = mapped_column(Text)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    resources_added: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resources_changed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resources_destroyed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    plan_file_url: Mapped[Optional[str]] = mapped_column(String(500))
    log_url: Mapped[Optional[str]] = mapped_column(String(500))
