import uuid
from enum import Enum

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class ScanType(str, Enum):
    SAST = "sast"
    DAST = "dast"
    DEPENDENCY = "dependency"
    CONTAINER = "container"
    SECRET = "secret"
    IAC = "iac"
    FULL = "full"


class ScanStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ScanJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "scan_jobs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    triggered_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    scan_type: Mapped[ScanType] = mapped_column(String(50), nullable=False)
    status: Mapped[ScanStatus] = mapped_column(
        String(50), default=ScanStatus.QUEUED, nullable=False, index=True
    )
    branch: Mapped[str] = mapped_column(String(100), default="main")
    commit_sha: Mapped[str | None] = mapped_column(String(40))
    target_url: Mapped[str | None] = mapped_column(Text)

    # Scores (0-100, higher = better posture)
    security_score: Mapped[float | None] = mapped_column(Float)
    critical_count: Mapped[int] = mapped_column(Integer, default=0)
    high_count: Mapped[int] = mapped_column(Integer, default=0)
    medium_count: Mapped[int] = mapped_column(Integer, default=0)
    low_count: Mapped[int] = mapped_column(Integer, default=0)
    info_count: Mapped[int] = mapped_column(Integer, default=0)

    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    celery_task_id: Mapped[str | None] = mapped_column(String(255))
    error_message: Mapped[str | None] = mapped_column(Text)
    report_s3_key: Mapped[str | None] = mapped_column(Text)

    project: Mapped["Project"] = relationship("Project", back_populates="scans")  # type: ignore[name-defined]
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="scan")


class Finding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "findings"

    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scan_jobs.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[Severity] = mapped_column(String(50), nullable=False, index=True)
    scanner: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)

    # Location
    file_path: Mapped[str | None] = mapped_column(Text)
    line_start: Mapped[int | None] = mapped_column(Integer)
    line_end: Mapped[int | None] = mapped_column(Integer)

    # Vulnerability details
    cve_id: Mapped[str | None] = mapped_column(String(50))
    cwe_id: Mapped[str | None] = mapped_column(String(50))
    cvss_score: Mapped[float | None] = mapped_column(Float)
    remediation: Mapped[str | None] = mapped_column(Text)
    references: Mapped[list | None] = mapped_column(JSONB)
    raw_output: Mapped[dict | None] = mapped_column(JSONB)

    # Triage
    is_suppressed: Mapped[bool] = mapped_column(default=False)
    suppression_reason: Mapped[str | None] = mapped_column(Text)
    is_false_positive: Mapped[bool] = mapped_column(default=False)

    scan: Mapped[ScanJob] = relationship("ScanJob", back_populates="findings")
