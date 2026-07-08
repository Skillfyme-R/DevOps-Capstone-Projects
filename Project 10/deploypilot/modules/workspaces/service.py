"""
Workspace management: CRUD and locking.
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
from deploypilot.models.workspace import Workspace
from deploypilot.modules.audit.service import AuditService

log = get_logger(__name__)


def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower().strip())
    return re.sub(r"[\s_-]+", "-", slug)[:100]


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._audit = AuditService(db)

    async def create(
        self,
        org: Organization,
        actor: User,
        name: str,
        cloud_provider: str = "aws",
        aws_region: Optional[str] = None,
        terraform_version: str = "1.6.0",
        description: Optional[str] = None,
        auto_apply: bool = False,
    ) -> Workspace:
        slug = _slugify(name)

        # Enforce plan workspace limits
        result = await self.db.execute(
            select(Workspace).where(
                Workspace.organization_id == org.id,
                Workspace.deleted_at.is_(None),
            )
        )
        existing_count = len(result.scalars().all())
        if existing_count >= org.max_workspaces:
            raise ForbiddenError(
                f"Workspace limit ({org.max_workspaces}) reached for plan '{org.plan}'"
            )

        ws = Workspace(
            organization_id=org.id,
            name=name,
            slug=slug,
            description=description,
            cloud_provider=cloud_provider,
            aws_region=aws_region,
            terraform_version=terraform_version,
            auto_apply=auto_apply,
        )
        self.db.add(ws)
        await self.db.flush()

        await self._audit.record(
            action="workspace.created",
            resource_type="workspace",
            resource_id=str(ws.id),
            actor_id=str(actor.id),
            organization_id=str(org.id),
            after={"name": ws.name, "slug": ws.slug},
        )
        log.info("workspace_created", ws_id=str(ws.id), org=str(org.id))
        return ws

    async def get_by_id(self, ws_id: uuid.UUID) -> Workspace:
        result = await self.db.execute(
            select(Workspace).where(
                Workspace.id == ws_id,
                Workspace.deleted_at.is_(None),
            )
        )
        ws = result.scalar_one_or_none()
        if not ws:
            raise NotFoundError(f"Workspace {ws_id} not found")
        return ws

    async def list_for_org(self, org_id: uuid.UUID) -> list[Workspace]:
        result = await self.db.execute(
            select(Workspace).where(
                Workspace.organization_id == org_id,
                Workspace.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def lock(self, ws_id: uuid.UUID, actor: User, reason: str) -> Workspace:
        ws = await self.get_by_id(ws_id)
        ws.is_locked = True
        ws.lock_reason = reason
        await self.db.flush()
        await self._audit.record(
            action="workspace.locked",
            resource_type="workspace",
            resource_id=str(ws.id),
            actor_id=str(actor.id),
            after={"lock_reason": reason},
        )
        return ws

    async def unlock(self, ws_id: uuid.UUID, actor: User) -> Workspace:
        ws = await self.get_by_id(ws_id)
        ws.is_locked = False
        ws.lock_reason = None
        await self.db.flush()
        await self._audit.record(
            action="workspace.unlocked",
            resource_type="workspace",
            resource_id=str(ws.id),
            actor_id=str(actor.id),
        )
        return ws

    async def delete(self, ws_id: uuid.UUID, actor: User) -> None:
        ws = await self.get_by_id(ws_id)
        ws.soft_delete()
        await self.db.flush()
        await self._audit.record(
            action="workspace.deleted",
            resource_type="workspace",
            resource_id=str(ws.id),
            actor_id=str(actor.id),
        )
