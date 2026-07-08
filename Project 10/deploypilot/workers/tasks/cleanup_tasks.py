"""
Periodic maintenance tasks: expire stale approvals, prune audit logs.
"""
import asyncio
from datetime import datetime, timedelta, timezone

from celery.utils.log import get_task_logger
from sqlalchemy import select, update

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
        now = datetime.now(timezone.utc)
        async with managed_session() as db:
            result = await db.execute(
                update(ApprovalRequest)
                .where(
                    ApprovalRequest.status == ApprovalStatus.PENDING,
                    ApprovalRequest.expires_at <= now,
                )
                .values(status=ApprovalStatus.EXPIRED)
                .returning(ApprovalRequest.id)
            )
            expired_ids = [str(r[0]) for r in result.fetchall()]
            log.info(f"Expired {len(expired_ids)} approval requests")
            return {"expired": len(expired_ids)}

    return _run_async(_inner())


@celery_app.task(name="cleanup_tasks.prune_old_audit_logs")
def prune_old_audit_logs(retention_days: int = 365) -> dict:
    """Delete audit logs older than retention_days to control storage growth."""
    async def _inner():
        cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
        async with managed_session() as db:
            result = await db.execute(
                select(AuditLog).where(AuditLog.created_at < cutoff).limit(10000)
            )
            logs = result.scalars().all()
            count = len(logs)
            for entry in logs:
                await db.delete(entry)
            log.info(f"Pruned {count} audit log entries older than {retention_days} days")
            return {"pruned": count}

    return _run_async(_inner())
