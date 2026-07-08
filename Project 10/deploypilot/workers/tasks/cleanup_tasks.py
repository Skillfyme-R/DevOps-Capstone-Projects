import asyncio
from datetime import datetime, timezone
from celery.utils.log import get_task_logger
from sqlalchemy import select, update, delete

from deploypilot.workers.celery_app import celery_app
from deploypilot.core.database import managed_session
from deploypilot.models.approval import ApprovalRequest, ApprovalStatus
from deploypilot.models.audit import AuditLog

log = get_task_logger(__name__)


def _run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="cleanup_tasks.expire_stale_approvals")
def expire_stale_approvals() -> dict:
    async def _inner():
        async with managed_session() as db:
            now = datetime.now(timezone.utc).isoformat()
            result = await db.execute(
                select(ApprovalRequest).where(
                    ApprovalRequest.status == ApprovalStatus.PENDING,
                    ApprovalRequest.expires_at <= now,
                )
            )
            approvals = result.scalars().all()
            count = 0
            for appr in approvals:
                appr.status = ApprovalStatus.EXPIRED
                count += 1
            log.info(f"Expired {count} stale approval requests")
            return {"expired": count}

    return _run_async(_inner())


@celery_app.task(name="cleanup_tasks.prune_old_audit_logs")
def prune_old_audit_logs(retention_days: int = 365) -> dict:
    async def _inner():
        from datetime import timedelta
        async with managed_session() as db:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()
            result = await db.execute(
                delete(AuditLog).where(AuditLog.created_at <= cutoff)
            )
            pruned = result.rowcount
            log.info(f"Pruned {pruned} audit log entries older than {retention_days} days")
            return {"pruned": pruned}

    return _run_async(_inner())
