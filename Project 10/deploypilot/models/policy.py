import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class PolicyType(str, enum.Enum):
    REQUIRE_APPROVAL = "require_approval"
    COST_THRESHOLD = "cost_threshold"
    RESOURCE_BLOCK = "resource_block"
    AUTO_APPLY = "auto_apply"
    MERGE_GUARD = "merge_guard"


class Policy(Base, UUIDMixin, TimestampMixin):
    """
    Policies define guard-rails for infrastructure runs within a workspace.
    They are evaluated before and after plan execution.
    """
    __tablename__ = "policies"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_type: Mapped[PolicyType] = mapped_column(
        Enum(PolicyType, name="policy_type_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    # Policy rules encoded as JSON string (real impl: JSONB column)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True)

    # For REQUIRE_APPROVAL: how many approvers needed
    min_approvers: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    workspace: Mapped["Workspace"] = relationship("Workspace")  # type: ignore

    def __repr__(self) -> str:
        return f"<Policy {self.name} type={self.policy_type}>"
