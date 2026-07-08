"""
Webhook handler: parses GitHub events and dispatches appropriate actions.
Supports push and pull_request events.
"""
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.core.logging import get_logger
from deploypilot.models.project import Project
from deploypilot.models.run import RunTrigger
from deploypilot.models.user import User
from deploypilot.modules.integrations.github_client import GitHubAppClient
from deploypilot.modules.runs.service import RunService
from deploypilot.workers.tasks.run_tasks import execute_plan

log = get_logger(__name__)


class GitHubWebhookHandler:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def handle(self, event_type: str, payload: dict[str, Any]) -> dict:
        match event_type:
            case "pull_request":
                return await self._handle_pull_request(payload)
            case "push":
                return await self._handle_push(payload)
            case "ping":
                return {"message": "pong"}
            case _:
                log.info("gh_webhook_unhandled_event", event=event_type)
                return {"message": f"Event '{event_type}' not handled"}

    async def _handle_pull_request(self, payload: dict) -> dict:
        action = payload.get("action")
        if action not in ("opened", "synchronize"):
            return {"message": f"PR action '{action}' skipped"}

        pr = payload["pull_request"]
        repo = payload["repository"]
        repo_url = repo["clone_url"]
        branch = pr["head"]["ref"]
        sha = pr["head"]["sha"]
        pr_number = pr["number"]
        pr_url = pr["html_url"]

        projects = await self._find_projects_for_repo(repo_url)
        triggered = []
        for project in projects:
            # Use a system bot user for VCS-triggered runs
            system_user = await self._get_or_create_system_user()
            svc = RunService(self.db)
            run = await svc.create_run(
                project=project,
                actor=system_user,
                trigger=RunTrigger.PULL_REQUEST,
                commit_sha=sha,
                branch=branch,
                pr_number=pr_number,
                pr_url=pr_url,
            )
            # Dispatch plan task to Celery
            execute_plan.apply_async(args=[str(run.id)], countdown=2)
            triggered.append(str(run.id))
            log.info("run_triggered_by_pr", run_id=str(run.id), pr=pr_number)

        return {"triggered_runs": triggered}

    async def _handle_push(self, payload: dict) -> dict:
        repo = payload["repository"]
        repo_url = repo["clone_url"]
        branch = payload.get("ref", "").replace("refs/heads/", "")
        sha = payload.get("after", "")

        projects = await self._find_projects_for_repo(repo_url, branch=branch)
        triggered = []
        for project in projects:
            system_user = await self._get_or_create_system_user()
            svc = RunService(self.db)
            run = await svc.create_run(
                project=project,
                actor=system_user,
                trigger=RunTrigger.VCS_PUSH,
                commit_sha=sha,
                branch=branch,
            )
            execute_plan.apply_async(args=[str(run.id)], countdown=2)
            triggered.append(str(run.id))

        return {"triggered_runs": triggered}

    async def _find_projects_for_repo(
        self, repo_url: str, branch: str | None = None
    ) -> list[Project]:
        q = select(Project).where(
            Project.repo_url == repo_url,
            Project.is_active.is_(True),
            Project.deleted_at.is_(None),
        )
        if branch:
            q = q.where(Project.repo_branch == branch)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def _get_or_create_system_user(self) -> User:
        result = await self.db.execute(
            select(User).where(User.email == "system@deploypilot.internal")
        )
        user = result.scalar_one_or_none()
        if not user:
            from deploypilot.core.security import hash_password
            import secrets
            user = User(
                email="system@deploypilot.internal",
                username="deploypilot-system",
                display_name="DeployPilot System",
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                is_active=True,
                is_email_verified=True,
            )
            self.db.add(user)
            await self.db.flush()
        return user
