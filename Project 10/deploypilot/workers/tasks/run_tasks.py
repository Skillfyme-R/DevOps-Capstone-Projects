"""
Celery tasks that execute Terraform plan/apply for an InfrastructureRun.
Each task is idempotent — re-running it on a finished run is a no-op.
"""
import asyncio
import json
from typing import Optional

from celery import Task
from celery.utils.log import get_task_logger

from deploypilot.workers.celery_app import celery_app
from deploypilot.core.database import managed_session
from deploypilot.models.run import InfrastructureRun, RunStatus
from deploypilot.modules.runs.engine import TerraformEngine, TerraformError
from deploypilot.modules.runs.service import RunService
from deploypilot.modules.secrets.service import SecretService

log = get_task_logger(__name__)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(bind=True, name="run_tasks.execute_plan", max_retries=2)
def execute_plan(self: Task, run_id: str) -> dict:
    """
    Steps:
      1. Transition run → PLANNING
      2. Collect secrets and build env map
      3. Run `terraform init && plan`
      4. Transition run → PLAN_COMPLETE or FAILED
    """
    log.info(f"Starting plan for run {run_id}")

    async def _inner():
        async with managed_session() as db:
            svc = RunService(db)
            run = await svc.get_by_id(run_id)

            if run.status not in (RunStatus.PENDING, RunStatus.QUEUED):
                log.warning(f"Run {run_id} already in status {run.status}, skipping plan")
                return {"skipped": True, "status": run.status.value}

            await svc.transition_status(run_id, RunStatus.PLANNING)

            # Collect injected secrets
            secret_svc = SecretService(db)
            env_vars = await secret_svc.collect_env_for_run(run)

            engine = TerraformEngine(run)
            try:
                plan_output, summary = await engine.plan(env_vars)
                await svc.transition_status(
                    run_id=run_id,
                    new_status=RunStatus.PLAN_COMPLETE,
                    plan_output=plan_output,
                    resources_added=summary["added"],
                    resources_changed=summary["changed"],
                    resources_destroyed=summary["destroyed"],
                )
                log.info(f"Plan complete for run {run_id}: {summary}")
                return {"status": "plan_complete", "summary": summary}

            except TerraformError as exc:
                await svc.transition_status(
                    run_id=run_id,
                    new_status=RunStatus.FAILED,
                    error_message=str(exc),
                )
                log.error(f"Plan failed for run {run_id}: {exc}")
                return {"status": "failed", "error": str(exc)}

            finally:
                engine.cleanup()

    try:
        return _run_async(_inner())
    except Exception as exc:
        log.exception(f"Unhandled error in execute_plan for run {run_id}")
        raise self.retry(exc=exc, countdown=30)


@celery_app.task(bind=True, name="run_tasks.execute_apply", max_retries=1)
def execute_apply(self: Task, run_id: str) -> dict:
    """
    Steps:
      1. Transition run → APPLYING
      2. Run `terraform apply`
      3. Transition run → APPLIED or FAILED
    """
    log.info(f"Starting apply for run {run_id}")

    async def _inner():
        async with managed_session() as db:
            svc = RunService(db)
            run = await svc.get_by_id(run_id)

            if run.status != RunStatus.APPROVED:
                log.warning(f"Run {run_id} not in APPROVED state (is {run.status}), skipping apply")
                return {"skipped": True}

            await svc.transition_status(run_id, RunStatus.APPLYING)

            secret_svc = SecretService(db)
            env_vars = await secret_svc.collect_env_for_run(run)

            engine = TerraformEngine(run)
            try:
                apply_output = await engine.apply(env_vars)
                await svc.transition_status(
                    run_id=run_id,
                    new_status=RunStatus.APPLIED,
                    apply_output=apply_output,
                )
                log.info(f"Apply complete for run {run_id}")
                return {"status": "applied"}

            except TerraformError as exc:
                await svc.transition_status(
                    run_id=run_id,
                    new_status=RunStatus.FAILED,
                    error_message=str(exc),
                )
                log.error(f"Apply failed for run {run_id}: {exc}")
                return {"status": "failed", "error": str(exc)}

            finally:
                engine.cleanup()

    try:
        return _run_async(_inner())
    except Exception as exc:
        log.exception(f"Unhandled error in execute_apply for run {run_id}")
        raise self.retry(exc=exc, countdown=60)
