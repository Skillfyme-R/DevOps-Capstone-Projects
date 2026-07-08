"""
Notification dispatcher: routes events to email, Slack, and in-app channels.
"""
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.core.config import settings
from deploypilot.core.logging import get_logger
from deploypilot.models.notification import Notification, NotificationChannel
from deploypilot.models.run import InfrastructureRun
from deploypilot.models.user import User

log = get_logger(__name__)


class NotificationDispatcher:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def dispatch_run_event(self, run_id: str, event: str) -> None:
        result = await self.db.execute(
            select(InfrastructureRun).where(InfrastructureRun.id == uuid.UUID(run_id))
        )
        run = result.scalar_one_or_none()
        if not run:
            log.warning("notification_run_not_found", run_id=run_id)
            return

        if run.triggered_by_id:
            user_result = await self.db.execute(
                select(User).where(User.id == run.triggered_by_id)
            )
            user = user_result.scalar_one_or_none()
            if user:
                await self._create_in_app(
                    user=user,
                    event=event,
                    title=f"Run {event.replace('run.', '').replace('_', ' ').title()}",
                    body=f"Your infrastructure run ({run_id[:8]}) has reached status: {event}",
                    metadata={"run_id": run_id},
                )

        # Slack notification
        if settings.SLACK_DEFAULT_WEBHOOK:
            await self._send_slack(
                webhook_url=settings.SLACK_DEFAULT_WEBHOOK,
                message=self._slack_run_message(run, event),
            )

    async def send_approval_notification(self, approval_id: str) -> None:
        from deploypilot.models.approval import ApprovalRequest
        result = await self.db.execute(
            select(ApprovalRequest).where(ApprovalRequest.id == uuid.UUID(approval_id))
        )
        req = result.scalar_one_or_none()
        if not req:
            return

        user_result = await self.db.execute(
            select(User).where(User.id == req.requested_by_id)
        )
        user = user_result.scalar_one_or_none()
        if user:
            await self._create_in_app(
                user=user,
                event="run.awaiting_approval",
                title="Approval Required",
                body=f"Run {str(req.run_id)[:8]} requires your approval before apply.",
                metadata={"approval_id": approval_id, "run_id": str(req.run_id)},
            )
            if user.email and settings.SMTP_HOST:
                await self._send_email(
                    to_address=user.email,
                    subject="[DeployPilot] Approval Required",
                    body=f"An infrastructure run requires your approval.\n\nApproval ID: {approval_id}",
                )

    # ── Channel senders ───────────────────────────────────────────────────────

    async def _create_in_app(
        self,
        user: User,
        event: str,
        title: str,
        body: str,
        metadata: Optional[dict] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user.id,
            channel=NotificationChannel.IN_APP,
            event=event,
            title=title,
            body=body,
            is_sent=True,
            metadata_json=json.dumps(metadata) if metadata else None,
        )
        self.db.add(notif)
        await self.db.flush()
        return notif

    async def _send_email(self, to_address: str, subject: str, body: str) -> None:
        if not settings.SMTP_HOST:
            log.debug("smtp_not_configured_skipping", to=to_address)
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_ADDRESS
        msg["To"] = to_address
        msg.attach(MIMEText(body, "plain"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_ADDRESS, [to_address], msg.as_string())
            log.info("email_sent", to=to_address, subject=subject)
        except Exception as exc:
            log.error("email_send_failed", to=to_address, error=str(exc))

    async def _send_slack(self, webhook_url: str, message: dict) -> None:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(webhook_url, json=message)
                resp.raise_for_status()
            log.info("slack_notification_sent")
        except Exception as exc:
            log.error("slack_notification_failed", error=str(exc))

    @staticmethod
    def _slack_run_message(run: InfrastructureRun, event: str) -> dict:
        status_emoji = {
            "run.applied": "✅",
            "run.failed": "❌",
            "run.awaiting_approval": "⏳",
            "run.plan_complete": "📋",
        }.get(event, "ℹ️")

        return {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"{status_emoji} *DeployPilot Run Update*\n"
                            f"Run `{str(run.id)[:8]}` — *{event}*\n"
                            f"Branch: `{run.branch}` | "
                            f"Resources: +{run.resources_added} ~{run.resources_changed} -{run.resources_destroyed}"
                        ),
                    },
                }
            ]
        }
