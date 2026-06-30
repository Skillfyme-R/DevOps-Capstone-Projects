"""Aggregates scan data into organisation-level security posture metrics."""
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scan import Finding, ScanJob, ScanStatus, Severity
from app.schemas.scan import SecurityPostureResponse


async def get_organisation_posture(
    db: AsyncSession, organisation_id: uuid.UUID
) -> SecurityPostureResponse:
    # Fetch recent completed scans for this org's projects
    scans_stmt = (
        select(ScanJob)
        .join(ScanJob.project)
        .where(
            ScanJob.status == ScanStatus.COMPLETED,
        )
        .order_by(ScanJob.created_at.desc())
        .limit(50)
    )
    scans = list((await db.scalars(scans_stmt)).all())

    scores = [s.security_score for s in scans if s.security_score is not None]
    overall_score = round(sum(scores) / len(scores), 1) if scores else 100.0

    # Trend: compare average of last 5 vs previous 5 scans
    if len(scores) >= 10:
        recent_avg = sum(scores[:5]) / 5
        older_avg = sum(scores[5:10]) / 5
        if recent_avg > older_avg + 2:
            trend = "improving"
        elif recent_avg < older_avg - 2:
            trend = "degrading"
        else:
            trend = "stable"
    else:
        trend = "stable"

    severity_counts = {s.value: 0 for s in Severity}
    for scan in scans:
        severity_counts[Severity.CRITICAL.value] += scan.critical_count
        severity_counts[Severity.HIGH.value] += scan.high_count
        severity_counts[Severity.MEDIUM.value] += scan.medium_count
        severity_counts[Severity.LOW.value] += scan.low_count

    top_projects = sorted(
        [
            {
                "project_id": str(s.project_id),
                "score": s.security_score or 100.0,
                "critical": s.critical_count,
            }
            for s in scans
        ],
        key=lambda x: x["score"],
    )[:5]

    return SecurityPostureResponse(
        organization_id=organisation_id,
        overall_score=overall_score,
        trend=trend,
        scans_this_month=len(scans),
        open_critical=severity_counts[Severity.CRITICAL.value],
        open_high=severity_counts[Severity.HIGH.value],
        open_medium=severity_counts[Severity.MEDIUM.value],
        open_low=severity_counts[Severity.LOW.value],
        top_vulnerable_projects=top_projects,
        severity_breakdown=severity_counts,
    )
