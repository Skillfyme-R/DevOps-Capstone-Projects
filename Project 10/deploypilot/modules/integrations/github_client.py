"""
GitHub App client: post plan summaries as PR comments, set commit statuses,
and handle incoming webhooks.
"""
import hashlib
import hmac
import json
import time
from typing import Optional

import httpx
import jwt as pyjwt

from deploypilot.core.config import settings
from deploypilot.core.logging import get_logger

log = get_logger(__name__)

GITHUB_API = "https://api.github.com"


class GitHubAppClient:
    """
    Authenticates as a GitHub App and performs installation-scoped API calls.
    JWT is generated per-request; installation tokens are cached in Redis.
    """

    def __init__(self, installation_id: str):
        self.installation_id = installation_id
        self._installation_token: Optional[str] = None
        self._token_expiry: float = 0

    # ── Auth ──────────────────────────────────────────────────────────────────

    def _build_app_jwt(self) -> str:
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + 600,
            "iss": settings.GITHUB_APP_ID,
        }
        private_key = (settings.GITHUB_APP_PRIVATE_KEY or "").replace("\\n", "\n")
        return pyjwt.encode(payload, private_key, algorithm="RS256")

    async def _get_installation_token(self) -> str:
        if self._installation_token and time.time() < self._token_expiry:
            return self._installation_token

        app_jwt = self._build_app_jwt()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GITHUB_API}/app/installations/{self.installation_id}/access_tokens",
                headers={
                    "Authorization": f"Bearer {app_jwt}",
                    "Accept": "application/vnd.github+json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        self._installation_token = data["token"]
        self._token_expiry = time.time() + 3000  # tokens valid for ~1 hour
        return self._installation_token

    # ── PR / Commit integration ───────────────────────────────────────────────

    async def post_pr_comment(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        body: str,
    ) -> dict:
        token = await self._get_installation_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GITHUB_API}/repos/{owner}/{repo}/issues/{pr_number}/comments",
                headers=self._headers(token),
                json={"body": body},
            )
            resp.raise_for_status()
            log.info("gh_pr_comment_posted", owner=owner, repo=repo, pr=pr_number)
            return resp.json()

    async def set_commit_status(
        self,
        owner: str,
        repo: str,
        sha: str,
        state: str,         # pending | success | failure | error
        description: str,
        context: str = "deploypilot/terraform",
        target_url: Optional[str] = None,
    ) -> dict:
        token = await self._get_installation_token()
        payload: dict = {
            "state": state,
            "description": description[:140],
            "context": context,
        }
        if target_url:
            payload["target_url"] = target_url

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GITHUB_API}/repos/{owner}/{repo}/statuses/{sha}",
                headers=self._headers(token),
                json=payload,
            )
            resp.raise_for_status()
            log.info("gh_commit_status_set", sha=sha[:8], state=state)
            return resp.json()

    async def get_file_content(
        self,
        owner: str,
        repo: str,
        path: str,
        ref: str = "main",
    ) -> str:
        """Fetch a file from the repository and decode its content."""
        import base64
        token = await self._get_installation_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                headers=self._headers(token),
                params={"ref": ref},
            )
            resp.raise_for_status()
            data = resp.json()
        return base64.b64decode(data["content"]).decode()

    # ── Webhook verification ──────────────────────────────────────────────────

    @staticmethod
    def verify_webhook_signature(payload: bytes, signature_header: str) -> bool:
        if not settings.GITHUB_WEBHOOK_SECRET:
            return False
        expected = "sha256=" + hmac.new(
            settings.GITHUB_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature_header)

    # ── Plan comment template ─────────────────────────────────────────────────

    @staticmethod
    def format_plan_comment(
        project_name: str,
        run_id: str,
        status: str,
        added: int,
        changed: int,
        destroyed: int,
        plan_output: str,
        run_url: Optional[str] = None,
    ) -> str:
        icon = "✅" if status == "plan_complete" else "❌"
        truncated = plan_output[:4000] if len(plan_output) > 4000 else plan_output
        link = f"\n\n[View full run →]({run_url})" if run_url else ""

        return (
            f"## {icon} DeployPilot — Terraform Plan\n\n"
            f"**Project:** `{project_name}` | **Run:** `{run_id[:8]}`\n\n"
            f"| Resource Type | Count |\n"
            f"|---|---|\n"
            f"| 🟢 Added | `{added}` |\n"
            f"| 🟡 Changed | `{changed}` |\n"
            f"| 🔴 Destroyed | `{destroyed}` |\n\n"
            f"<details>\n<summary>Plan Output</summary>\n\n"
            f"```hcl\n{truncated}\n```\n</details>"
            f"{link}"
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _headers(token: str) -> dict:
        return {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
