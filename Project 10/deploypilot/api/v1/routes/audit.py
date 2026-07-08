"""Audit log routes."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.modules.audit.service import AuditService

router = APIRouter(prefix="/organizations/{org_id}/audit", tags=["Audit"])


class AuditLogResponse(BaseModel):
    id: UUID
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    actor_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    org_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Return audit log entries for an organization."""
    svc = AuditService(db)
    return await svc.list_for_org(org_id=org_id)
