"""
Organization management: CRUD, membership, slug generation.
"""
import re
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import ConflictError, ForbiddenError, NotFoundError
from deploypilot.core.logging import get_logger
from deploypilot.models.organization import Organization
from deploypilot.models.user import User
from deploypilot.modules.audit.service import AuditService

log = get_logger(__name__)


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug[:100]


class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._audit = AuditService(db)

    async def create(
        self,
        name: str,
        owner: User,
        description: Optional[str] = None,
        website: Optional[str] = None,
    ) -> Organization:
        slug = await self._unique_slug(_slugify(name))

        org = Organization(
            name=name,
            slug=slug,
            description=description,
            website=website,
            owner_id=owner.id,
        )
        self.db.add(org)
        await self.db.flush()

        await self._audit.record(
            action="organization.created",
            resource_type="organization",
            resource_id=str(org.id),
            actor_id=str(owner.id),
            organization_id=str(org.id),
            after={"name": org.name, "slug": org.slug},
        )
        log.info("org_created", org_id=str(org.id), slug=slug, owner=str(owner.id))
        return org

    async def get_by_id(self, org_id: uuid.UUID) -> Organization:
        result = await self.db.execute(
            select(Organization).where(
                Organization.id == org_id,
                Organization.deleted_at.is_(None),
            )
        )
        org = result.scalar_one_or_none()
        if not org:
            raise NotFoundError(f"Organization {org_id} not found")
        return org

    async def get_by_slug(self, slug: str) -> Organization:
        result = await self.db.execute(
            select(Organization).where(
                Organization.slug == slug,
                Organization.deleted_at.is_(None),
            )
        )
        org = result.scalar_one_or_none()
        if not org:
            raise NotFoundError(f"Organization '{slug}' not found")
        return org

    async def update(
        self,
        org_id: uuid.UUID,
        actor: User,
        name: Optional[str] = None,
        description: Optional[str] = None,
        website: Optional[str] = None,
    ) -> Organization:
        org = await self.get_by_id(org_id)
        self._require_owner_or_admin(org, actor)

        before = {"name": org.name, "description": org.description}
        if name:
            org.name = name
        if description is not None:
            org.description = description
        if website is not None:
            org.website = website

        await self.db.flush()
        await self._audit.record(
            action="organization.updated",
            resource_type="organization",
            resource_id=str(org.id),
            actor_id=str(actor.id),
            organization_id=str(org.id),
            before=before,
            after={"name": org.name, "description": org.description},
        )
        return org

    async def delete(self, org_id: uuid.UUID, actor: User) -> None:
        org = await self.get_by_id(org_id)
        if org.owner_id != actor.id:
            raise ForbiddenError("Only the organization owner can delete it")

        org.soft_delete()
        await self.db.flush()
        await self._audit.record(
            action="organization.deleted",
            resource_type="organization",
            resource_id=str(org.id),
            actor_id=str(actor.id),
        )

    async def list_for_user(self, user: User) -> list[Organization]:
        result = await self.db.execute(
            select(Organization).where(
                Organization.owner_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _require_owner_or_admin(self, org: Organization, user: User) -> None:
        from deploypilot.models.user import UserRole
        if org.owner_id != user.id and user.role not in (UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN):
            raise ForbiddenError("You don't have permission to modify this organization")

    async def _unique_slug(self, base: str) -> str:
        slug = base
        counter = 1
        while True:
            result = await self.db.execute(
                select(Organization).where(Organization.slug == slug)
            )
            if not result.scalar_one_or_none():
                return slug
            slug = f"{base}-{counter}"
            counter += 1
