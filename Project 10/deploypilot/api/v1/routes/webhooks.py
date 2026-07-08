"""Webhook ingestion endpoints."""

from fastapi import APIRouter, Header, HTTPException, Request

from deploypilot.core.security import verify_github_webhook
from deploypilot.modules.integrations.webhook_handler import WebhookHandler

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(default=""),
    x_github_event: str = Header(default=""),
):
    """
    Receive GitHub App webhook events.

    Validates the HMAC-SHA256 signature before processing.
    """
    payload = await request.body()

    if not verify_github_webhook(payload, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    handler = WebhookHandler()
    import json

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if x_github_event == "push":
        await handler.handle_push(data)
    elif x_github_event == "pull_request":
        await handler.handle_pull_request(data)

    return {"status": "accepted", "event": x_github_event}
