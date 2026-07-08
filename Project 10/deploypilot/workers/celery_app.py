"""
Celery application factory.
Workers are started separately from the API: `celery -A deploypilot.workers.celery_app worker`
"""
from celery import Celery
from celery.utils.log import get_task_logger

from deploypilot.core.config import settings

celery_app = Celery(
    "deploypilot",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "deploypilot.workers.tasks.run_tasks",
        "deploypilot.workers.tasks.notification_tasks",
        "deploypilot.workers.tasks.cleanup_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,                  # re-queue if worker dies mid-task
    worker_prefetch_multiplier=1,         # fair dispatch — one task at a time per worker
    task_soft_time_limit=1800,            # 30 min soft limit
    task_time_limit=2100,                 # 35 min hard kill
    beat_schedule={
        "expire-approvals": {
            "task": "deploypilot.workers.tasks.cleanup_tasks.expire_stale_approvals",
            "schedule": 300.0,            # every 5 minutes
        },
        "prune-audit-logs": {
            "task": "deploypilot.workers.tasks.cleanup_tasks.prune_old_audit_logs",
            "schedule": 86400.0,          # daily
        },
    },
)
