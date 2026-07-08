import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from deploypilot.core.database import Base
from deploypilot.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class Workspace(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    A Workspace groups related infrastructure projects within an Organization.
    Typically maps to an environment (dev, staging, production) or a product area.
    """
    __tablename__ = "workspaces"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cloud_provider: Mapped[str] = mapped_column(String(30), default="aws", nullable=False)
    aws_region: Mapped[str | None] = mapped_column(String(30), nullable=True)
    aws_account_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    terraform_version: Mapped[str] = mapped_column(String(20), default="1.6.0", nullable=False)
    auto_apply: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lock_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Remote state config (stored as JSON-like string — real impl uses JSONB)
    state_backend: Mapped[str] = mapped_column(String(30), default="s3", nullable=False)
    state_config: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="workspaces")  # type: ignore
    projects: Mapped[list] = relationship("Project", back_populates="workspace", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Workspace {self.slug}>"
