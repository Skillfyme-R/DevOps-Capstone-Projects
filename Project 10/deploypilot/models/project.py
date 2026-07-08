import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from deploypilot.core.database import Base
from deploypilot.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class Project(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    An Infrastructure Project maps a VCS directory (Terraform root module)
    to a Workspace, and is the unit of execution for plan/apply runs.
    """
    __tablename__ = "projects"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # VCS / repository info
    repo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    repo_branch: Mapped[str] = mapped_column(String(200), default="main", nullable=False)
    repo_dir: Mapped[str] = mapped_column(String(300), default=".", nullable=False)
    vcs_provider: Mapped[str] = mapped_column(String(30), default="github", nullable=False)
    installation_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Terraform
    terraform_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    var_file: Mapped[str | None] = mapped_column(String(300), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="projects")
    runs: Mapped[list] = relationship("InfrastructureRun", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Project {self.slug}>"
