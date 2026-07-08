import uuid
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.api.v1.schemas.run import (
    ApproveRunRequest,
    CreateRunRequest,
    RejectRunRequest,
    RunResponse,
)
from deploypilot.common.middleware.auth import CurrentUser
from deploypilot.core.database import get_db
from deploypilot.models.run import RunTrigger
from deploypilot.modules.approvals.service import ApprovalService
from deploypilot.modules.policies.service import PolicyService
from deploypilot.modules.projects.service import ProjectService
from deploypilot.modules.runs.service import RunService
from deploypilot.workers.tasks.run_tasks import execute_plan

router = APIRouter(prefix="/projects/{project_id}/runs", tags=["Infrastructure Runs"])


@router.post("", response_model=RunResponse, status_code=202)
async def trigger_run(
    project_id: uuid.UUID,
    body: CreateRunRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    proj_svc = ProjectService(db)
    project = await proj_svc.get_by_id(project_id)

    run_svc = RunService(db)
    run = await run_svc.create_run(
        project=project,
        actor=current_user,
        trigger=RunTrigger.MANUAL,
        commit_sha=body.commit_sha,
        branch=body.branch,
    )
    # Enqueue plan job
    execute_plan.apply_async(args=[str(run.id)], countdown=1)
    return run


@router.get("", response_model=List[RunResponse])
async def list_runs(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    svc = RunService(db)
    return await svc.list_for_project(project_id, limit=limit, offset=offset)


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(
    project_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = RunService(db)
    return await svc.get_by_id(run_id)


@router.post("/{run_id}/cancel", response_model=RunResponse)
async def cancel_run(
    project_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = RunService(db)
    return await svc.cancel(run_id, current_user)


@router.post("/{run_id}/approve", response_model=RunResponse)
async def approve_run(
    project_id: uuid.UUID,
    run_id: uuid.UUID,
    body: ApproveRunRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    run_svc = RunService(db)
    run = await run_svc.get_by_id(run_id)

    approval_svc = ApprovalService(db)
    pending = await approval_svc.list_pending_for_run(run_id)
    if not pending:
        # Create one on the fly for manual approvals
        req = await approval_svc.request_approval(run=run, requester=current_user)
        pending = [req]

    await approval_svc.approve(
        approval_id=pending[0].id,
        reviewer=current_user,
        comment=body.comment,
    )
    return await run_svc.get_by_id(run_id)


@router.post("/{run_id}/reject", response_model=RunResponse)
async def reject_run(
    project_id: uuid.UUID,
    run_id: uuid.UUID,
    body: RejectRunRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    run_svc = RunService(db)
    run = await run_svc.get_by_id(run_id)

    approval_svc = ApprovalService(db)
    pending = await approval_svc.list_pending_for_run(run_id)
    if not pending:
        req = await approval_svc.request_approval(run=run, requester=current_user)
        pending = [req]

    await approval_svc.reject(
        approval_id=pending[0].id,
        reviewer=current_user,
        comment=body.comment,
    )
    return await run_svc.get_by_id(run_id)
