"""Project model."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class Project(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column()
    repo_url: Mapped[Optional[str]] = mapped_column(String(500))
    repo_branch: Mapped[str] = mapped_column(String(200), default="main", nullable=False)
    repo_dir: Mapped[str] = mapped_column(String(300), default=".", nullable=False)
    vcs_provider: Mapped[str] = mapped_column(String(30), default="github", nullable=False)
    installation_id: Mapped[Optional[str]] = mapped_column(String(100))
    terraform_version: Mapped[Optional[str]] = mapped_column(String(20))
    var_file: Mapped[Optional[str]] = mapped_column(String(300))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
