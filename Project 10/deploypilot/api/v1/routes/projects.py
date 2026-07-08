"""Project routes — CRUD under a workspace."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.run import ProjectResponse, ProjectCreateRequest
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.modules.projects.service import ProjectService

router = APIRouter(
    prefix="/workspaces/{ws_id}/projects",
    tags=["Projects"],
)


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    ws_id: UUID,
    payload: ProjectCreateRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = ProjectService(db)
    project = await svc.create(
        workspace_id=ws_id,
        name=payload.name,
        description=payload.description,
        repo_url=payload.repo_url,
        repo_branch=payload.repo_branch,
        repo_dir=payload.repo_dir,
        vcs_provider=payload.vcs_provider,
    )
    await db.commit()
    return project


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    ws_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = ProjectService(db)
    return await svc.list_for_workspace(ws_id)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    ws_id: UUID,
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = ProjectService(db)
    return await svc.get_by_id(project_id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    ws_id: UUID,
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = ProjectService(db)
    await svc.delete(project_id, current_user)
    await db.commit()
