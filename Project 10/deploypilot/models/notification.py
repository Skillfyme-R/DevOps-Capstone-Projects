import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    IN_APP = "in_app"


class NotificationEvent(str, enum.Enum):
    RUN_STARTED = "run.started"
    RUN_PLAN_COMPLETE = "run.plan_complete"
    RUN_AWAITING_APPROVAL = "run.awaiting_approval"
    RUN_APPROVED = "run.approved"
    RUN_REJECTED = "run.rejected"
    RUN_APPLIED = "run.applied"
    RUN_FAILED = "run.failed"
    POLICY_VIOLATION = "policy.violation"
    WORKSPACE_LOCKED = "workspace.locked"


class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )

    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    event: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User")  # type: ignore
