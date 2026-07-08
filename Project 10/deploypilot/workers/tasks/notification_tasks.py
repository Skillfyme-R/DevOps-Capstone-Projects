import asyncio
from celery.utils.log import get_task_logger

from deploypilot.workers.celery_app import celery_app
from deploypilot.core.database import managed_session

log = get_task_logger(__name__)


def _run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="notification_tasks.dispatch_run_event")
def dispatch_run_event(run_id: str, event: str) -> None:
    log.info(f"Dispatching event {event} for run {run_id}")

    async def _inner():
        async with managed_session() as db:
            from deploypilot.modules.notifications.service import NotificationService
            svc = NotificationService(db)
            await svc.dispatch_run_event(run_id, event)

    _run_async(_inner())


@celery_app.task(name="notification_tasks.send_approval_request")
def send_approval_request(approval_id: str) -> None:
    log.info(f"Sending approval request notification for {approval_id}")

    async def _inner():
        async with managed_session() as db:
            from deploypilot.modules.notifications.service import NotificationService
            svc = NotificationService(db)
            await svc.dispatch_approval_request(approval_id)

    _run_async(_inner())
