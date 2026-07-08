"""Project service — CRUD operations."""

import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import NotFoundError
from deploypilot.models.project import Project
from deploypilot.models.user import User


class ProjectService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        workspace_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        repo_url: Optional[str] = None,
        repo_branch: str = "main",
        repo_dir: str = ".",
        vcs_provider: str = "github",
    ) -> Project:
        slug = self._slugify(name)
        project = Project(
            workspace_id=workspace_id,
            name=name.strip(),
            slug=slug,
            description=description,
            repo_url=repo_url,
            repo_branch=repo_branch,
            repo_dir=repo_dir,
            vcs_provider=vcs_provider,
        )
        self.db.add(project)
        await self.db.flush()
        await self.db.refresh(project)
        return project

    async def get_by_id(self, project_id: uuid.UUID) -> Project:
        project = await self.db.get(Project, project_id)
        if not project or project.deleted_at is not None:
            raise NotFoundError("Project not found")
        return project

    async def list_for_workspace(self, workspace_id: uuid.UUID) -> List[Project]:
        result = await self.db.execute(
            select(Project).where(
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def delete(self, project_id: uuid.UUID, actor: User) -> None:
        project = await self.get_by_id(project_id)
        project.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

    @staticmethod
    def _slugify(name: str) -> str:
        base = re.sub(r"[^\w\s-]", "", name.lower())
        return re.sub(r"[-_\s]+", "-", base).strip("-")
