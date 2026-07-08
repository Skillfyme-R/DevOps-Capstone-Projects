import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from deploypilot.core.database import Base
from deploypilot.models.base import TimestampMixin, UUIDMixin


class TeamRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MAINTAINER = "maintainer"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"


class Team(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "teams"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="teams")  # type: ignore
    memberships: Mapped[list["TeamMembership"]] = relationship(
        "TeamMembership", back_populates="team", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_team_org_slug"),
    )

    def __repr__(self) -> str:
        return f"<Team {self.slug}>"


class TeamMembership(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "team_memberships"

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[TeamRole] = mapped_column(
        Enum(TeamRole, name="team_role_enum", values_callable=lambda x: [e.value for e in x]),
        default=TeamRole.CONTRIBUTOR,
        nullable=False,
    )

    team: Mapped["Team"] = relationship("Team", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="team_memberships")  # type: ignore

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )
