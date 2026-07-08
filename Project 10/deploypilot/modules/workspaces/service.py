"""Workspace service — CRUD, lock/unlock."""

import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import ConflictError, NotFoundError
from deploypilot.models.user import User
from deploypilot.models.workspace import Workspace


class WorkspaceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        org_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        cloud_provider: str = "aws",
        aws_region: Optional[str] = None,
        terraform_version: str = "1.6.0",
        auto_apply: bool = False,
    ) -> Workspace:
        slug = self._slugify(name)
        ws = Workspace(
            organization_id=org_id,
            name=name.strip(),
            slug=slug,
            description=description,
            cloud_provider=cloud_provider,
            aws_region=aws_region,
            terraform_version=terraform_version,
            auto_apply=auto_apply,
        )
        self.db.add(ws)
        await self.db.flush()
        await self.db.refresh(ws)
        return ws

    async def get_by_id(self, ws_id: uuid.UUID) -> Workspace:
        ws = await self.db.get(Workspace, ws_id)
        if not ws or ws.deleted_at is not None:
            raise NotFoundError("Workspace not found")
        return ws

    async def list_for_org(self, org_id: uuid.UUID) -> List[Workspace]:
        result = await self.db.execute(
            select(Workspace).where(
                Workspace.organization_id == org_id,
                Workspace.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def lock(self, ws_id: uuid.UUID, reason: str, actor: User) -> Workspace:
        ws = await self.get_by_id(ws_id)
        ws.is_locked = True
        ws.lock_reason = reason
        await self.db.flush()
        await self.db.refresh(ws)
        return ws

    async def unlock(self, ws_id: uuid.UUID, actor: User) -> Workspace:
        ws = await self.get_by_id(ws_id)
        ws.is_locked = False
        ws.lock_reason = None
        await self.db.flush()
        await self.db.refresh(ws)
        return ws

    async def delete(self, ws_id: uuid.UUID, actor: User) -> None:
        ws = await self.get_by_id(ws_id)
        ws.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

    @staticmethod
    def _slugify(name: str) -> str:
        base = re.sub(r"[^\w\s-]", "", name.lower())
        return re.sub(r"[-_\s]+", "-", base).strip("-")
