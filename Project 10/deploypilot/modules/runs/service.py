"""
RunService — manages the lifecycle of an InfrastructureRun.
The actual Terraform execution is delegated to TerraformEngine
and is typically invoked by a Celery worker, not the API request directly.
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import ForbiddenError, NotFoundError
from deploypilot.core.logging import get_logger
from deploypilot.models.project import Project
from deploypilot.models.run import InfrastructureRun, RunStatus, RunTrigger
from deploypilot.models.user import User
from deploypilot.modules.audit.service import AuditService

log = get_logger(__name__)


class RunService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._audit = AuditService(db)

    async def create_run(
        self,
        project: Project,
        actor: User,
        trigger: RunTrigger = RunTrigger.MANUAL,
        commit_sha: Optional[str] = None,
        branch: Optional[str] = None,
        pr_number: Optional[int] = None,
        pr_url: Optional[str] = None,
    ) -> InfrastructureRun:
        # Prevent concurrent active runs on the same project
        active = await self._active_run_for_project(project.id)
        if active:
            raise ForbiddenError(
                f"Project already has an active run ({active.id}). "
                "Cancel or wait for it to complete before starting a new one."
            )

        run = InfrastructureRun(
            project_id=project.id,
            triggered_by_id=actor.id,
            trigger=trigger,
            status=RunStatus.PENDING,
            commit_sha=commit_sha,
            branch=branch or project.repo_branch,
            pr_number=pr_number,
            pr_url=pr_url,
        )
        self.db.add(run)
        await self.db.flush()

        await self._audit.record(
            action="run.created",
            resource_type="infrastructure_run",
            resource_id=str(run.id),
            actor_id=str(actor.id),
            after={"status": run.status.value, "trigger": run.trigger.value},
        )
        log.info("run_created", run_id=str(run.id), project=str(project.id))
        return run

    async def get_by_id(self, run_id: uuid.UUID) -> InfrastructureRun:
        result = await self.db.execute(
            select(InfrastructureRun).where(InfrastructureRun.id == run_id)
        )
        run = result.scalar_one_or_none()
        if not run:
            raise NotFoundError(f"Run {run_id} not found")
        return run

    async def list_for_project(
        self,
        project_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> list[InfrastructureRun]:
        result = await self.db.execute(
            select(InfrastructureRun)
            .where(InfrastructureRun.project_id == project_id)
            .order_by(InfrastructureRun.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def transition_status(
        self,
        run_id: uuid.UUID,
        new_status: RunStatus,
        actor_id: Optional[str] = None,
        error_message: Optional[str] = None,
        plan_output: Optional[str] = None,
        apply_output: Optional[str] = None,
        resources_added: int = 0,
        resources_changed: int = 0,
        resources_destroyed: int = 0,
    ) -> InfrastructureRun:
        run = await self.get_by_id(run_id)
        now = datetime.now(timezone.utc)

        old_status = run.status
        run.status = new_status

        # Update timing fields based on transition
        if new_status == RunStatus.QUEUED:
            run.queued_at = now
        elif new_status == RunStatus.PLANNING:
            run.started_at = now
        elif new_status == RunStatus.PLAN_COMPLETE:
            run.plan_completed_at = now
            run.plan_output = plan_output
            run.resources_added = resources_added
            run.resources_changed = resources_changed
            run.resources_destroyed = resources_destroyed
        elif new_status == RunStatus.APPLYING:
            run.apply_started_at = now
        elif new_status in (RunStatus.APPLIED, RunStatus.FAILED, RunStatus.CANCELLED, RunStatus.DISCARDED):
            run.completed_at = now
            if apply_output:
                run.apply_output = apply_output
            if error_message:
                run.error_message = error_message

        await self.db.flush()
        await self._audit.record(
            action=f"run.status_changed.{new_status.value}",
            resource_type="infrastructure_run",
            resource_id=str(run.id),
            actor_id=actor_id,
            before={"status": old_status.value},
            after={"status": new_status.value},
        )
        log.info(
            "run_status_changed",
            run_id=str(run.id),
            old=old_status.value,
            new=new_status.value,
        )
        return run

    async def cancel(self, run_id: uuid.UUID, actor: User) -> InfrastructureRun:
        run = await self.get_by_id(run_id)
        cancellable = {RunStatus.PENDING, RunStatus.QUEUED, RunStatus.AWAITING_APPROVAL}
        if run.status not in cancellable:
            raise ForbiddenError(f"Run in status '{run.status}' cannot be cancelled")

        return await self.transition_status(
            run_id=run_id,
            new_status=RunStatus.CANCELLED,
            actor_id=str(actor.id),
        )

    # ── Private ───────────────────────────────────────────────────────────────

    async def _active_run_for_project(
        self, project_id: uuid.UUID
    ) -> Optional[InfrastructureRun]:
        active_statuses = [
            RunStatus.QUEUED, RunStatus.PLANNING, RunStatus.PLAN_COMPLETE,
            RunStatus.AWAITING_APPROVAL, RunStatus.APPROVED, RunStatus.APPLYING,
        ]
        result = await self.db.execute(
            select(InfrastructureRun).where(
                InfrastructureRun.project_id == project_id,
                InfrastructureRun.status.in_(active_statuses),
            )
        )
        return result.scalar_one_or_none()
