"""
ApprovalService: request, approve, reject approval gates on runs.
"""
from datetime import datetime, timedelta, timezone
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import ForbiddenError, NotFoundError
from deploypilot.core.logging import get_logger
from deploypilot.models.approval import ApprovalRequest, ApprovalStatus
from deploypilot.models.run import InfrastructureRun, RunStatus
from deploypilot.models.user import User
from deploypilot.modules.audit.service import AuditService
from deploypilot.modules.runs.service import RunService

log = get_logger(__name__)

APPROVAL_EXPIRE_HOURS = 72


class ApprovalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._audit = AuditService(db)
        self._runs = RunService(db)

    async def request_approval(
        self,
        run: InfrastructureRun,
        requester: User,
        policy_id: Optional[uuid.UUID] = None,
    ) -> ApprovalRequest:
        req = ApprovalRequest(
            run_id=run.id,
            policy_id=policy_id,
            requested_by_id=requester.id,
            status=ApprovalStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=APPROVAL_EXPIRE_HOURS),
        )
        self.db.add(req)

        await self._runs.transition_status(run.id, RunStatus.AWAITING_APPROVAL, actor_id=str(requester.id))
        await self.db.flush()

        await self._audit.record(
            action="approval.requested",
            resource_type="approval_request",
            resource_id=str(req.id),
            actor_id=str(requester.id),
        )
        log.info("approval_requested", approval_id=str(req.id), run=str(run.id))
        return req

    async def approve(
        self,
        approval_id: uuid.UUID,
        reviewer: User,
        comment: Optional[str] = None,
    ) -> ApprovalRequest:
        req = await self._get_or_404(approval_id)
        self._assert_pending(req)

        req.status = ApprovalStatus.APPROVED
        req.reviewed_by_id = reviewer.id
        req.reviewed_at = datetime.now(timezone.utc)
        req.comment = comment

        await self._runs.transition_status(
            req.run_id,
            RunStatus.APPROVED,
            actor_id=str(reviewer.id),
        )
        await self.db.flush()

        await self._audit.record(
            action="approval.approved",
            resource_type="approval_request",
            resource_id=str(req.id),
            actor_id=str(reviewer.id),
            after={"comment": comment},
        )

        # Dispatch apply task
        from deploypilot.workers.tasks.run_tasks import execute_apply
        execute_apply.apply_async(args=[str(req.run_id)], countdown=3)
        log.info("approval_granted", approval_id=str(req.id), reviewer=str(reviewer.id))
        return req

    async def reject(
        self,
        approval_id: uuid.UUID,
        reviewer: User,
        comment: Optional[str] = None,
    ) -> ApprovalRequest:
        req = await self._get_or_404(approval_id)
        self._assert_pending(req)

        req.status = ApprovalStatus.REJECTED
        req.reviewed_by_id = reviewer.id
        req.reviewed_at = datetime.now(timezone.utc)
        req.comment = comment

        await self._runs.transition_status(
            req.run_id,
            RunStatus.DISCARDED,
            actor_id=str(reviewer.id),
        )
        await self.db.flush()

        await self._audit.record(
            action="approval.rejected",
            resource_type="approval_request",
            resource_id=str(req.id),
            actor_id=str(reviewer.id),
            after={"comment": comment},
        )
        log.info("approval_rejected", approval_id=str(req.id))
        return req

    async def list_pending_for_run(self, run_id: uuid.UUID) -> list[ApprovalRequest]:
        result = await self.db.execute(
            select(ApprovalRequest).where(
                ApprovalRequest.run_id == run_id,
                ApprovalRequest.status == ApprovalStatus.PENDING,
            )
        )
        return list(result.scalars().all())

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_or_404(self, approval_id: uuid.UUID) -> ApprovalRequest:
        result = await self.db.execute(
            select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
        )
        req = result.scalar_one_or_none()
        if not req:
            raise NotFoundError(f"Approval request {approval_id} not found")
        return req

    @staticmethod
    def _assert_pending(req: ApprovalRequest) -> None:
        if req.status != ApprovalStatus.PENDING:
            raise ForbiddenError(
                f"Approval request is already in '{req.status}' state and cannot be modified"
            )
