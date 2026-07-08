"""Notification service — creation and dispatch stubs."""

import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.core.logging import get_logger
from deploypilot.models.notification import Notification, NotificationChannel

log = get_logger(__name__)


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_notification(
        self,
        user_id: uuid.UUID,
        channel: NotificationChannel,
        event: str,
        title: str,
        body: str,
        organization_id: Optional[uuid.UUID] = None,
        metadata_json: Optional[str] = None,
    ) -> Notification:
        """Persist a notification record."""
        notification = Notification(
            user_id=user_id,
            organization_id=organization_id,
            channel=channel,
            event=event,
            title=title,
            body=body,
            metadata_json=metadata_json,
        )
        self.db.add(notification)
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def dispatch(self, notification: Notification) -> bool:
        """
        Dispatch a notification via the appropriate channel.

        This is a stub implementation — production would integrate with
        SendGrid (email), Slack API, or a push notification service.
        """
        if notification.channel == NotificationChannel.EMAIL:
            log.info(
                "notification_dispatch_email",
                notification_id=str(notification.id),
                event=notification.event,
                title=notification.title,
            )
            # TODO: integrate SendGrid / SMTP
            notification.is_sent = True

        elif notification.channel == NotificationChannel.SLACK:
            log.info(
                "notification_dispatch_slack",
                notification_id=str(notification.id),
                event=notification.event,
            )
            # TODO: post to Slack webhook
            notification.is_sent = True

        elif notification.channel == NotificationChannel.WEBHOOK:
            log.info(
                "notification_dispatch_webhook",
                notification_id=str(notification.id),
                event=notification.event,
            )
            # TODO: HTTP POST to configured URL
            notification.is_sent = True

        elif notification.channel == NotificationChannel.IN_APP:
            notification.is_sent = True

        await self.db.flush()
        return notification.is_sent
