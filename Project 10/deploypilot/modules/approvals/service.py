"""Approval request service."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import NotFoundError
from deploypilot.models.approval import ApprovalRequest, ApprovalStatus
from deploypilot.models.user import User


class ApprovalService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def request_approval(
        self,
        run_id: uuid.UUID,
        requested_by: User,
        policy_id: Optional[uuid.UUID] = None,
        ttl_hours: int = 48,
    ) -> ApprovalRequest:
        """Create a pending approval request for a run."""
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=ttl_hours)).isoformat()
        approval = ApprovalRequest(
            run_id=run_id,
            policy_id=policy_id,
            requested_by_id=requested_by.id,
            status=ApprovalStatus.PENDING,
            expires_at=expires_at,
        )
        self.db.add(approval)
        await self.db.flush()
        await self.db.refresh(approval)
        return approval

    async def approve(
        self,
        approval_id: uuid.UUID,
        reviewer: User,
        comment: Optional[str] = None,
    ) -> ApprovalRequest:
        """Mark an approval request as approved."""
        approval = await self._get_by_id(approval_id)
        approval.status = ApprovalStatus.APPROVED
        approval.reviewed_by_id = reviewer.id
        approval.reviewed_at = datetime.now(timezone.utc).isoformat()
        approval.comment = comment
        await self.db.flush()
        await self.db.refresh(approval)
        return approval

    async def reject(
        self,
        approval_id: uuid.UUID,
        reviewer: User,
        comment: str,
    ) -> ApprovalRequest:
        """Mark an approval request as rejected."""
        approval = await self._get_by_id(approval_id)
        approval.status = ApprovalStatus.REJECTED
        approval.reviewed_by_id = reviewer.id
        approval.reviewed_at = datetime.now(timezone.utc).isoformat()
        approval.comment = comment
        await self.db.flush()
        await self.db.refresh(approval)
        return approval

    async def list_pending_for_run(self, run_id: uuid.UUID) -> List[ApprovalRequest]:
        """Return all pending approval requests for a run."""
        result = await self.db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.run_id == run_id,
                ApprovalRequest.status == ApprovalStatus.PENDING,
            )
        )
        return list(result.scalars().all())

    async def _get_by_id(self, approval_id: uuid.UUID) -> ApprovalRequest:
        approval = await self.db.get(ApprovalRequest, approval_id)
        if not approval:
            raise NotFoundError("Approval request not found")
        return approval
