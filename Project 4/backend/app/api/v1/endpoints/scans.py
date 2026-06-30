import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.scan import Finding, ScanJob, ScanStatus, Severity
from app.models.user import User
from app.schemas.scan import (
    FindingSuppressRequest,
    ScanDetailResponse,
    ScanListResponse,
    ScanSummary,
    ScanTriggerRequest,
    SecurityPostureResponse,
)
from app.services.posture_service import get_organisation_posture
from app.services.scan_engine import execute_scan
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/scans", tags=["Security Scans"])


@router.post("", response_model=ScanSummary, status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan(
    req: ScanTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanSummary:
    scan_job = ScanJob(
        project_id=req.project_id,
        triggered_by=current_user.id,
        scan_type=req.scan_type,
        branch=req.branch,
        commit_sha=req.commit_sha,
        target_url=str(req.target_url) if req.target_url else None,
        status=ScanStatus.RUNNING,
    )
    db.add(scan_job)
    await db.flush()

    try:
        findings_data, score = await execute_scan(
            scan_job=scan_job,
            target_path=".",
            target_url=str(req.target_url) if req.target_url else None,
        )

        for f in findings_data:
            finding = Finding(
                scan_id=scan_job.id,
                title=f.title,
                description=f.description,
                severity=f.severity,
                scanner=f.scanner,
                category=f.category,
                file_path=f.file_path,
                line_start=f.line_start,
                line_end=f.line_end,
                cve_id=f.cve_id,
                cwe_id=f.cwe_id,
                cvss_score=f.cvss_score,
                remediation=f.remediation,
                references=f.references,
                raw_output=f.raw_output,
            )
            db.add(finding)

        scan_job.status = ScanStatus.COMPLETED
        scan_job.security_score = score
        scan_job.critical_count = sum(1 for f in findings_data if f.severity == Severity.CRITICAL)
        scan_job.high_count = sum(1 for f in findings_data if f.severity == Severity.HIGH)
        scan_job.medium_count = sum(1 for f in findings_data if f.severity == Severity.MEDIUM)
        scan_job.low_count = sum(1 for f in findings_data if f.severity == Severity.LOW)
        scan_job.info_count = sum(1 for f in findings_data if f.severity == Severity.INFO)
    except Exception as exc:
        scan_job.status = ScanStatus.FAILED
        scan_job.error_message = str(exc)

    await db.flush()
    return ScanSummary.model_validate(scan_job)


@router.get("", response_model=ScanListResponse)
async def list_scans(
    project_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanListResponse:
    stmt = select(ScanJob).order_by(ScanJob.created_at.desc())
    if project_id:
        stmt = stmt.where(ScanJob.project_id == project_id)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = list(
        (
            await db.scalars(stmt.offset((page - 1) * page_size).limit(page_size))
        ).all()
    )
    return ScanListResponse(
        items=[ScanSummary.model_validate(s) for s in items],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


@router.get("/posture", response_model=SecurityPostureResponse)
async def security_posture(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SecurityPostureResponse:
    return await get_organisation_posture(db, current_user.organization_id)


@router.get("/{scan_id}", response_model=ScanDetailResponse)
async def get_scan(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanDetailResponse:
    scan = await db.scalar(
        select(ScanJob)
        .options(selectinload(ScanJob.findings))
        .where(ScanJob.id == scan_id)
    )
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    return ScanDetailResponse.model_validate(scan)


@router.post("/{scan_id}/findings/{finding_id}/suppress", status_code=status.HTTP_204_NO_CONTENT)
async def suppress_finding(
    scan_id: uuid.UUID,
    finding_id: uuid.UUID,
    req: FindingSuppressRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    finding = await db.scalar(
        select(Finding).where(Finding.id == finding_id, Finding.scan_id == scan_id)
    )
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")
    finding.is_suppressed = True
    finding.suppression_reason = req.reason
