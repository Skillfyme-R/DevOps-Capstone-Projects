import httpx
from deploypilot.core.config import settings
from deploypilot.core.logging import get_logger

log = get_logger(__name__)

GITHUB_API_BASE = "https://api.github.com"


class GitHubClient:
    def __init__(self, installation_id: str, token: str | None = None):
        self.installation_id = installation_id
        self._token = token

    async def get_installation_token(self) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GITHUB_API_BASE}/app/installations/{self.installation_id}/access_tokens",
                headers={"Authorization": f"Bearer {settings.GITHUB_APP_ID}", "Accept": "application/vnd.github+json"},
            )
            resp.raise_for_status()
            return resp.json()["token"]

    async def get_pull_request(self, owner: str, repo: str, pr_number: int) -> dict:
        token = self._token or await self.get_installation_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            )
            resp.raise_for_status()
            return resp.json()

    async def create_commit_status(self, owner: str, repo: str, sha: str, state: str, description: str, context: str = "deploypilot") -> dict:
        token = self._token or await self.get_installation_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/statuses/{sha}",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
                json={"state": state, "description": description, "context": context},
            )
            resp.raise_for_status()
            return resp.json()
