"""
Project management: register a Terraform root module in a workspace.
"""
import re
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import NotFoundError
from deploypilot.core.logging import get_logger
from deploypilot.models.project import Project
from deploypilot.models.user import User
from deploypilot.models.workspace import Workspace
from deploypilot.modules.audit.service import AuditService

log = get_logger(__name__)


def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower().strip())
    return re.sub(r"[\s_-]+", "-", slug)[:100]


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._audit = AuditService(db)

    async def create(
        self,
        workspace: Workspace,
        actor: User,
        name: str,
        repo_url: Optional[str] = None,
        repo_branch: str = "main",
        repo_dir: str = ".",
        vcs_provider: str = "github",
        description: Optional[str] = None,
        terraform_version: Optional[str] = None,
    ) -> Project:
        project = Project(
            workspace_id=workspace.id,
            name=name,
            slug=_slugify(name),
            description=description,
            repo_url=repo_url,
            repo_branch=repo_branch,
            repo_dir=repo_dir,
            vcs_provider=vcs_provider,
            terraform_version=terraform_version,
        )
        self.db.add(project)
        await self.db.flush()

        await self._audit.record(
            action="project.created",
            resource_type="project",
            resource_id=str(project.id),
            actor_id=str(actor.id),
            after={"name": project.name, "repo_url": repo_url},
        )
        log.info("project_created", project_id=str(project.id), ws=str(workspace.id))
        return project

    async def get_by_id(self, project_id: uuid.UUID) -> Project:
        result = await self.db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.deleted_at.is_(None),
            )
        )
        proj = result.scalar_one_or_none()
        if not proj:
            raise NotFoundError(f"Project {project_id} not found")
        return proj

    async def list_for_workspace(self, ws_id: uuid.UUID) -> list[Project]:
        result = await self.db.execute(
            select(Project).where(
                Project.workspace_id == ws_id,
                Project.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def delete(self, project_id: uuid.UUID, actor: User) -> None:
        proj = await self.get_by_id(project_id)
        proj.soft_delete()
        await self.db.flush()
        await self._audit.record(
            action="project.deleted",
            resource_type="project",
            resource_id=str(proj.id),
            actor_id=str(actor.id),
        )
