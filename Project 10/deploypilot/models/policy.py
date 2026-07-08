"""Policy model."""

import uuid
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class PolicyType(str, Enum):
    REQUIRE_APPROVAL = "require_approval"
    COST_THRESHOLD = "cost_threshold"
    RESOURCE_BLOCK = "resource_block"
    AUTO_APPLY = "auto_apply"
    MERGE_GUARD = "merge_guard"


class Policy(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "policies"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    policy_type: Mapped[PolicyType] = mapped_column(
        SAEnum(PolicyType, name="policy_type_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    rules: Mapped[Optional[str]] = mapped_column(Text)
    min_approvers: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
