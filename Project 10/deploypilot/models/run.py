import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class RunStatus(str, enum.Enum):
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


class RunTrigger(str, enum.Enum):
    MANUAL = "manual"
    VCS_PUSH = "vcs_push"
    PULL_REQUEST = "pull_request"
    SCHEDULE = "schedule"
    API = "api"


class InfrastructureRun(Base, UUIDMixin, TimestampMixin):
    """
    Represents a single plan+apply lifecycle for an infrastructure project.
    Each run captures the full audit trail from trigger to completion.
    """
    __tablename__ = "infrastructure_runs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    triggered_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus, name="run_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=RunStatus.PENDING, nullable=False, index=True
    )
    trigger: Mapped[RunTrigger] = mapped_column(
        Enum(RunTrigger, name="run_trigger_enum", values_callable=lambda x: [e.value for e in x]),
        default=RunTrigger.MANUAL, nullable=False
    )

    # VCS context
    commit_sha: Mapped[str | None] = mapped_column(String(40), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    pr_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pr_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Terraform output
    plan_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    apply_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Change summary
    resources_added: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resources_changed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    resources_destroyed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timing
    queued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    plan_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    apply_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Artifacts
    plan_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    log_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="runs")  # type: ignore
    triggered_by: Mapped["User"] = relationship("User", foreign_keys=[triggered_by_id])  # type: ignore
    approvals: Mapped[list] = relationship("ApprovalRequest", back_populates="run", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Run {self.id} status={self.status}>"
