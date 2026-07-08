import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class SecretScope(str, enum.Enum):
    ORGANIZATION = "organization"
    WORKSPACE = "workspace"
    PROJECT = "project"


class Secret(Base, UUIDMixin, TimestampMixin):
    """
    Encrypted key-value secrets that are injected into infrastructure runs
    as environment variables. The value is encrypted at-rest using AWS KMS or
    a local Fernet key, depending on configuration.
    """
    __tablename__ = "secrets"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )

    scope: Mapped[SecretScope] = mapped_column(
        Enum(SecretScope, name="secret_scope_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    key: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    value_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_sensitive: Mapped[bool] = mapped_column(default=True, nullable=False)

    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])  # type: ignore

    def __repr__(self) -> str:
        return f"<Secret {self.key} scope={self.scope}>"
