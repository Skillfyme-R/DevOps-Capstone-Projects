"""
AuditService — append-only audit log writer.
Called from every service that mutates state; never called directly by routes.
"""
import json
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.models.audit import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        before: Optional[Any] = None,
        after: Optional[Any] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> AuditLog:
        log_entry = AuditLog(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            actor_id=actor_id,
            organization_id=organization_id,
            before_state=json.dumps(before) if before is not None else None,
            after_state=json.dumps(after) if after is not None else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
        self.db.add(log_entry)
        await self.db.flush()
        return log_entry
