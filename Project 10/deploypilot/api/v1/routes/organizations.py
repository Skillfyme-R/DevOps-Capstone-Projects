import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.organization import (
    CreateOrgRequest,
    OrgResponse,
    UpdateOrgRequest,
)
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.modules.organizations.service import OrganizationService

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("", response_model=OrgResponse, status_code=201)
async def create_organization(
    body: CreateOrgRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OrganizationService(db)
    return await svc.create(
        name=body.name,
        owner=current_user,
        description=body.description,
        website=body.website,
    )


@router.get("", response_model=List[OrgResponse])
async def list_organizations(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OrganizationService(db)
    return await svc.list_for_user(current_user)


@router.get("/{org_id}", response_model=OrgResponse)
async def get_organization(
    org_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OrganizationService(db)
    return await svc.get_by_id(org_id)


@router.patch("/{org_id}", response_model=OrgResponse)
async def update_organization(
    org_id: uuid.UUID,
    body: UpdateOrgRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OrganizationService(db)
    return await svc.update(
        org_id=org_id,
        actor=current_user,
        name=body.name,
        description=body.description,
        website=body.website,
    )


@router.delete("/{org_id}", status_code=204)
async def delete_organization(
    org_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OrganizationService(db)
    await svc.delete(org_id=org_id, actor=current_user)
