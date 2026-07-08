"""Workspace routes nested under an organization."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.workspace import (
    CreateWorkspaceRequest,
    LockWorkspaceRequest,
    WorkspaceResponse,
)
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.modules.workspaces.service import WorkspaceService

router = APIRouter(
    prefix="/organizations/{org_id}/workspaces",
    tags=["Workspaces"],
)


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    org_id: UUID,
    body: CreateWorkspaceRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace inside an organization."""
    svc = WorkspaceService(db)
    return await svc.create(
        org_id=org_id,
        name=body.name,
        description=body.description,
        cloud_provider=body.cloud_provider,
        aws_region=body.aws_region,
        terraform_version=body.terraform_version,
        auto_apply=body.auto_apply,
    )


@router.get("/", response_model=List[WorkspaceResponse])
async def list_workspaces(
    org_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces in an organization."""
    svc = WorkspaceService(db)
    return await svc.list_for_org(org_id=org_id)


@router.get("/{ws_id}", response_model=WorkspaceResponse)
async def get_workspace(
    org_id: UUID,
    ws_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single workspace."""
    svc = WorkspaceService(db)
    return await svc.get_by_id(ws_id=ws_id)


@router.post("/{ws_id}/lock", response_model=WorkspaceResponse)
async def lock_workspace(
    org_id: UUID,
    ws_id: UUID,
    body: LockWorkspaceRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Lock a workspace to prevent new runs."""
    svc = WorkspaceService(db)
    return await svc.lock(ws_id=ws_id, reason=body.reason, actor=current_user)


@router.post("/{ws_id}/unlock", response_model=WorkspaceResponse)
async def unlock_workspace(
    org_id: UUID,
    ws_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Unlock a previously locked workspace."""
    svc = WorkspaceService(db)
    return await svc.unlock(ws_id=ws_id, actor=current_user)


@router.delete("/{ws_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    org_id: UUID,
    ws_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a workspace."""
    svc = WorkspaceService(db)
    await svc.delete(ws_id=ws_id, actor=current_user)
