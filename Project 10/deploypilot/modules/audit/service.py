"""Audit log service."""

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.models.audit import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def record(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        actor_id: Optional[uuid.UUID] = None,
        organization_id: Optional[uuid.UUID] = None,
        before_state: Optional[str] = None,
        after_state: Optional[str] = None,
        ip_address: Optional[str] = None,
        request_id: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditLog:
        """Write an immutable audit log entry."""
        entry = AuditLog(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            actor_id=actor_id,
            organization_id=organization_id,
            before_state=before_state,
            after_state=after_state,
            ip_address=ip_address,
            request_id=request_id,
            user_agent=user_agent,
        )
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def list_for_org(
        self,
        org_id: uuid.UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditLog]:
        """Return audit log entries for an organization, newest first."""
        result = await self.db.execute(
            select(AuditLog)
            .where(AuditLog.organization_id == org_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
