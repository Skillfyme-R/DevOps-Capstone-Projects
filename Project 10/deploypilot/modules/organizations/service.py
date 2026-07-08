"""Organization service — CRUD operations."""

import re
import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import ConflictError, NotFoundError
from deploypilot.models.organization import Organization
from deploypilot.models.user import User


class OrgService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        name: str,
        owner: User,
        description: Optional[str] = None,
        website: Optional[str] = None,
    ) -> Organization:
        """Create a new organization."""
        slug = await self._unique_slug(name)
        org = Organization(
            name=name.strip(),
            slug=slug,
            description=description,
            website=website,
            owner_id=owner.id,
        )
        self.db.add(org)
        await self.db.flush()
        await self.db.refresh(org)
        return org

    async def get_by_id(self, org_id: uuid.UUID) -> Organization:
        """Return an organization by its UUID or raise 404."""
        org = await self.db.get(Organization, org_id)
        if not org or org.deleted_at is not None:
            raise NotFoundError("Organization not found")
        return org

    async def list_for_user(self, user: User) -> List[Organization]:
        """Return all active organizations owned by this user (simplified)."""
        result = await self.db.execute(
            select(Organization).where(
                Organization.owner_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def update(
        self,
        org_id: uuid.UUID,
        actor: User,
        **kwargs,
    ) -> Organization:
        """Update mutable fields on an organization."""
        org = await self.get_by_id(org_id)
        for field, value in kwargs.items():
            if hasattr(org, field):
                setattr(org, field, value)
        await self.db.flush()
        await self.db.refresh(org)
        return org

    async def delete(self, org_id: uuid.UUID, actor: User) -> None:
        """Soft-delete an organization."""
        from datetime import datetime, timezone

        org = await self.get_by_id(org_id)
        org.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def _unique_slug(self, name: str, max_attempts: int = 10) -> str:
        """Generate a unique slug from the organization name."""
        base = re.sub(r"[^\w\s-]", "", name.lower())
        base = re.sub(r"[-_\s]+", "-", base).strip("-")

        for attempt in range(max_attempts):
            candidate = base if attempt == 0 else f"{base}-{attempt}"
            result = await self.db.execute(
                select(Organization).where(Organization.slug == candidate)
            )
            if not result.scalar_one_or_none():
                return candidate

        # Fallback with UUID suffix
        return f"{base}-{uuid.uuid4().hex[:8]}"
