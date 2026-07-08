"""Infrastructure run routes nested under a project."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.run import (
    ApproveRunRequest,
    CreateRunRequest,
    RejectRunRequest,
    RunResponse,
)
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.modules.runs.service import RunService

router = APIRouter(
    prefix="/projects/{project_id}/runs",
    tags=["Runs"],
)


@router.post("/", response_model=RunResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_run(
    project_id: UUID,
    body: CreateRunRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Trigger a new infrastructure run (plan → apply pipeline)."""
    svc = RunService(db)
    return await svc.create_run(
        project_id=project_id,
        triggered_by=current_user,
        commit_sha=body.commit_sha,
        branch=body.branch,
    )


@router.get("/", response_model=List[RunResponse])
async def list_runs(
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """List all runs for a project."""
    svc = RunService(db)
    return await svc.list_for_project(project_id=project_id)


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(
    project_id: UUID,
    run_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific run by ID."""
    svc = RunService(db)
    return await svc.get_by_id(run_id=run_id)


@router.post("/{run_id}/cancel", response_model=RunResponse)
async def cancel_run(
    project_id: UUID,
    run_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a queued or running job."""
    svc = RunService(db)
    return await svc.cancel(run_id=run_id, actor=current_user)


@router.post("/{run_id}/approve", response_model=RunResponse)
async def approve_run(
    project_id: UUID,
    run_id: UUID,
    body: ApproveRunRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Approve a run that is awaiting human review."""
    svc = RunService(db)
    return await svc.approve(run_id=run_id, actor=current_user, comment=body.comment)


@router.post("/{run_id}/reject", response_model=RunResponse)
async def reject_run(
    project_id: UUID,
    run_id: UUID,
    body: RejectRunRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Reject a run that is awaiting human review."""
    svc = RunService(db)
    return await svc.reject(run_id=run_id, actor=current_user, comment=body.comment)
