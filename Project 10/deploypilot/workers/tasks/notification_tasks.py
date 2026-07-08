"""
Async notification dispatch: email, Slack, in-app.
"""
import asyncio

from celery.utils.log import get_task_logger

from deploypilot.workers.celery_app import celery_app
from deploypilot.core.database import managed_session
from deploypilot.modules.notifications.service import NotificationDispatcher

log = get_task_logger(__name__)


def _run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="notification_tasks.dispatch_run_event")
def dispatch_run_event(run_id: str, event: str) -> None:
    """Fire notifications for a run lifecycle event to all subscribed channels."""
    async def _inner():
        async with managed_session() as db:
            dispatcher = NotificationDispatcher(db)
            await dispatcher.dispatch_run_event(run_id=run_id, event=event)

    _run_async(_inner())


@celery_app.task(name="notification_tasks.send_approval_request")
def send_approval_request(approval_id: str) -> None:
    async def _inner():
        async with managed_session() as db:
            dispatcher = NotificationDispatcher(db)
            await dispatcher.send_approval_notification(approval_id=approval_id)

    _run_async(_inner())
