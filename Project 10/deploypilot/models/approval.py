"""ApprovalRequest model."""

import uuid
from enum import Enum
from typing import Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ApprovalRequest(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "approval_requests"

    run_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("infrastructure_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    policy_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("policies.id", ondelete="SET NULL"),
    )
    requested_by_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    status: Mapped[ApprovalStatus] = mapped_column(
        SAEnum(
            ApprovalStatus,
            name="approval_status_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=ApprovalStatus.PENDING,
        nullable=False,
        index=True,
    )
    comment: Mapped[Optional[str]] = mapped_column(Text)
    expires_at: Mapped[Optional[str]] = mapped_column(nullable=True)
    reviewed_at: Mapped[Optional[str]] = mapped_column(nullable=True)
