"""Run service — lifecycle management for infrastructure runs."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import BadRequestError, NotFoundError
from deploypilot.models.run import InfrastructureRun, RunStatus, RunTrigger
from deploypilot.models.user import User


class RunService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_run(
        self,
        project_id: uuid.UUID,
        triggered_by: User,
        commit_sha: Optional[str] = None,
        branch: Optional[str] = None,
        trigger: RunTrigger = RunTrigger.MANUAL,
    ) -> InfrastructureRun:
        """Create a run record and enqueue the Celery plan task."""
        run = InfrastructureRun(
            project_id=project_id,
            triggered_by_id=triggered_by.id,
            status=RunStatus.QUEUED,
            trigger=trigger,
            commit_sha=commit_sha,
            branch=branch,
        )
        self.db.add(run)
        await self.db.flush()
        await self.db.refresh(run)

        # Enqueue async plan task
        from deploypilot.workers.tasks.run_tasks import execute_plan

        execute_plan.delay(str(run.id))

        return run

    async def get_by_id(self, run_id: uuid.UUID) -> InfrastructureRun:
        run = await self.db.get(InfrastructureRun, run_id)
        if not run:
            raise NotFoundError("Run not found")
        return run

    async def list_for_project(self, project_id: uuid.UUID) -> List[InfrastructureRun]:
        result = await self.db.execute(
            select(InfrastructureRun)
            .where(InfrastructureRun.project_id == project_id)
            .order_by(InfrastructureRun.created_at.desc())
        )
        return list(result.scalars().all())

    async def transition_status(
        self,
        run: InfrastructureRun,
        new_status: RunStatus,
    ) -> InfrastructureRun:
        run.status = new_status
        if new_status in {
            RunStatus.APPLIED,
            RunStatus.FAILED,
            RunStatus.CANCELLED,
            RunStatus.DESTROYED,
            RunStatus.DISCARDED,
        }:
            run.completed_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(run)
        return run

    async def cancel(self, run_id: uuid.UUID, actor: User) -> InfrastructureRun:
        run = await self.get_by_id(run_id)
        cancellable = {RunStatus.QUEUED, RunStatus.PLANNING, RunStatus.PLAN_COMPLETE, RunStatus.AWAITING_APPROVAL}
        if run.status not in cancellable:
            raise BadRequestError(f"Cannot cancel a run in status '{run.status.value}'")
        return await self.transition_status(run, RunStatus.CANCELLED)

    async def approve(
        self,
        run_id: uuid.UUID,
        actor: User,
        comment: Optional[str] = None,
    ) -> InfrastructureRun:
        run = await self.get_by_id(run_id)
        if run.status != RunStatus.AWAITING_APPROVAL:
            raise BadRequestError("Run is not awaiting approval")
        run = await self.transition_status(run, RunStatus.APPROVED)

        # Enqueue apply
        from deploypilot.workers.tasks.run_tasks import execute_apply

        execute_apply.delay(str(run.id))
        return run

    async def reject(
        self,
        run_id: uuid.UUID,
        actor: User,
        comment: str = "",
    ) -> InfrastructureRun:
        run = await self.get_by_id(run_id)
        if run.status != RunStatus.AWAITING_APPROVAL:
            raise BadRequestError("Run is not awaiting approval")
        return await self.transition_status(run, RunStatus.DISCARDED)
