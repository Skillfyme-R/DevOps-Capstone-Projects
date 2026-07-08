import asyncio
import uuid
from celery import Task
from celery.utils.log import get_task_logger

from deploypilot.workers.celery_app import celery_app
from deploypilot.core.database import managed_session
from deploypilot.models.run import InfrastructureRun, RunStatus
from deploypilot.modules.runs.engine import TerraformEngine, TerraformError
from deploypilot.modules.runs.service import RunService
from deploypilot.modules.secrets.service import SecretService

# Ensure all ORM models are registered in metadata so FK resolution works
import deploypilot.models.user  # noqa: F401
import deploypilot.models.organization  # noqa: F401
import deploypilot.models.workspace  # noqa: F401
import deploypilot.models.project  # noqa: F401
import deploypilot.models.team  # noqa: F401
import deploypilot.models.secret  # noqa: F401
import deploypilot.models.policy  # noqa: F401
import deploypilot.models.audit  # noqa: F401
import deploypilot.models.approval  # noqa: F401
import deploypilot.models.notification  # noqa: F401
import deploypilot.models.integration  # noqa: F401

log = get_task_logger(__name__)


def _run_async(coro):
    return asyncio.run(coro)


@celery_app.task(bind=True, name="deploypilot.workers.tasks.run_tasks.execute_plan", max_retries=2)
def execute_plan(self: Task, run_id: str) -> dict:
    log.info(f"Starting plan for run {run_id}")

    async def _inner():
        async with managed_session() as db:
            svc = RunService(db)
            run = await svc.get_by_id(uuid.UUID(run_id))

            if run.status not in (RunStatus.PENDING, RunStatus.QUEUED):
                log.warning(f"Run {run_id} already in status {run.status}, skipping plan")
                return {"skipped": True, "status": run.status.value}

            run = await svc.transition_status(run, RunStatus.PLANNING)

            # Load project to resolve workspace/org for secret scoping
            from deploypilot.models.project import Project
            from deploypilot.models.workspace import Workspace
            project = await db.get(Project, run.project_id)
            workspace = await db.get(Workspace, project.workspace_id) if project else None

            secret_svc = SecretService(db)
            env_vars = await secret_svc.collect_env_for_run(
                organization_id=workspace.organization_id if workspace else None,
                workspace_id=workspace.id if workspace else None,
                project_id=run.project_id,
            )

            engine = TerraformEngine(run)
            try:
                plan_output, summary = await engine.plan(env_vars)
                await svc.transition_status(run, RunStatus.PLAN_COMPLETE)
                run.plan_output = plan_output
                run.resources_added = summary["added"]
                run.resources_changed = summary["changed"]
                run.resources_destroyed = summary["destroyed"]
                await db.flush()
                log.info(f"Plan complete for run {run_id}: {summary}")
                return {"status": "plan_complete", "summary": summary}

            except TerraformError as exc:
                await svc.transition_status(run, RunStatus.FAILED)
                run.error_message = str(exc)
                await db.flush()
                log.error(f"Plan failed for run {run_id}: {exc}")
                return {"status": "failed", "error": str(exc)}

            finally:
                engine.cleanup()

    try:
        return _run_async(_inner())
    except Exception as exc:
        log.exception(f"Unhandled error in execute_plan for run {run_id}")
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(bind=True, name="deploypilot.workers.tasks.run_tasks.execute_apply", max_retries=1)
def execute_apply(self: Task, run_id: str) -> dict:
    log.info(f"Starting apply for run {run_id}")

    async def _inner():
        async with managed_session() as db:
            svc = RunService(db)
            run = await svc.get_by_id(uuid.UUID(run_id))

            if run.status != RunStatus.APPROVED:
                log.warning(f"Run {run_id} not in APPROVED state (is {run.status}), skipping apply")
                return {"skipped": True}

            run = await svc.transition_status(run, RunStatus.APPLYING)

            from deploypilot.models.project import Project
            from deploypilot.models.workspace import Workspace
            project = await db.get(Project, run.project_id)
            workspace = await db.get(Workspace, project.workspace_id) if project else None

            secret_svc = SecretService(db)
            env_vars = await secret_svc.collect_env_for_run(
                organization_id=workspace.organization_id if workspace else None,
                workspace_id=workspace.id if workspace else None,
                project_id=run.project_id,
            )

            engine = TerraformEngine(run)
            try:
                apply_output = await engine.apply(env_vars)
                await svc.transition_status(run, RunStatus.APPLIED)
                run.apply_output = apply_output
                await db.flush()
                log.info(f"Apply complete for run {run_id}")
                return {"status": "applied"}

            except TerraformError as exc:
                await svc.transition_status(run, RunStatus.FAILED)
                run.error_message = str(exc)
                await db.flush()
                log.error(f"Apply failed for run {run_id}: {exc}")
                return {"status": "failed", "error": str(exc)}

            finally:
                engine.cleanup()

    try:
        return _run_async(_inner())
    except Exception as exc:
        log.exception(f"Unhandled error in execute_apply for run {run_id}")
        raise self.retry(exc=exc, countdown=60)
