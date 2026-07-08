import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.workspace import (
    CreateWorkspaceRequest,
    LockWorkspaceRequest,
    WorkspaceResponse,
)
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.modules.organizations.service import OrganizationService
from deploypilot.modules.workspaces.service import WorkspaceService

router = APIRouter(prefix="/organizations/{org_id}/workspaces", tags=["Workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    org_id: uuid.UUID,
    body: CreateWorkspaceRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    org_svc = OrganizationService(db)
    org = await org_svc.get_by_id(org_id)
    svc = WorkspaceService(db)
    return await svc.create(
        org=org,
        actor=current_user,
        name=body.name,
        cloud_provider=body.cloud_provider,
        aws_region=body.aws_region,
        terraform_version=body.terraform_version,
        description=body.description,
        auto_apply=body.auto_apply,
    )


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    org_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.list_for_org(org_id)


@router.get("/{ws_id}", response_model=WorkspaceResponse)
async def get_workspace(
    org_id: uuid.UUID,
    ws_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.get_by_id(ws_id)


@router.post("/{ws_id}/lock", response_model=WorkspaceResponse)
async def lock_workspace(
    org_id: uuid.UUID,
    ws_id: uuid.UUID,
    body: LockWorkspaceRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.lock(ws_id, current_user, body.reason)


@router.post("/{ws_id}/unlock", response_model=WorkspaceResponse)
async def unlock_workspace(
    org_id: uuid.UUID,
    ws_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    return await svc.unlock(ws_id, current_user)


@router.delete("/{ws_id}", status_code=204)
async def delete_workspace(
    org_id: uuid.UUID,
    ws_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = WorkspaceService(db)
    await svc.delete(ws_id, current_user)
