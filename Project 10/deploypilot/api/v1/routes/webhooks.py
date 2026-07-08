"""
Webhook ingestion endpoints for GitHub events.
"""
import json

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import UnauthorizedError
from deploypilot.core.database import get_db
from deploypilot.modules.integrations.github_client import GitHubAppClient
from deploypilot.modules.integrations.webhook_handler import GitHubWebhookHandler

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/github")
async def github_webhook(
    request: Request,
    x_github_event: str = Header(...),
    x_hub_signature_256: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()

    if not GitHubAppClient.verify_webhook_signature(body, x_hub_signature_256):
        raise UnauthorizedError("Invalid webhook signature")

    payload = json.loads(body)
    handler = GitHubWebhookHandler(db)
    result = await handler.handle(x_github_event, payload)
    return result
