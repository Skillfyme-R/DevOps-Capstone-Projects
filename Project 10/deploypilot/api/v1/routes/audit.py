import uuid
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.models.audit import AuditLog


class AuditLogResponse(BaseModel):
    id: UUID
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    actor_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


router = APIRouter(prefix="/organizations/{org_id}/audit", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    org_id: uuid.UUID,
    current_user: CurrentUser,
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog).where(AuditLog.organization_id == org_id)
    if action:
        q = q.where(AuditLog.action == action)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
    q = q.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(q)
    return list(result.scalars().all())
