"""Organization CRUD routes."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.organization import (
    CreateOrgRequest,
    OrgResponse,
    UpdateOrgRequest,
)
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.modules.organizations.service import OrgService

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("/", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: CreateOrgRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization owned by the current user."""
    svc = OrgService(db)
    return await svc.create(
        name=body.name,
        description=body.description,
        website=body.website,
        owner=current_user,
    )


@router.get("/", response_model=List[OrgResponse])
async def list_organizations(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List all organizations the current user belongs to."""
    svc = OrgService(db)
    return await svc.list_for_user(user=current_user)


@router.get("/{org_id}", response_model=OrgResponse)
async def get_organization(
    org_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single organization by ID."""
    svc = OrgService(db)
    return await svc.get_by_id(org_id=org_id)


@router.patch("/{org_id}", response_model=OrgResponse)
async def update_organization(
    org_id: UUID,
    body: UpdateOrgRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update an organization's metadata."""
    svc = OrgService(db)
    return await svc.update(org_id=org_id, actor=current_user, **body.model_dump(exclude_none=True))


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete an organization."""
    svc = OrgService(db)
    await svc.delete(org_id=org_id, actor=current_user)
