import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from app.models.scan import Severity, ScanStatus, ScanType


class ScanTriggerRequest(BaseModel):
    project_id: uuid.UUID
    scan_type: ScanType = ScanType.FULL
    branch: str = "main"
    commit_sha: str | None = None
    target_url: HttpUrl | None = None
    options: dict = Field(default_factory=dict)


class FindingResponse(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    title: str
    description: str
    severity: Severity
    scanner: str
    category: str
    file_path: str | None
    line_start: int | None
    line_end: int | None
    cve_id: str | None
    cwe_id: str | None
    cvss_score: float | None
    remediation: str | None
    references: list | None
    is_suppressed: bool
    is_false_positive: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ScanSummary(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    scan_type: ScanType
    status: ScanStatus
    branch: str
    commit_sha: str | None
    security_score: float | None
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    duration_seconds: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ScanDetailResponse(ScanSummary):
    findings: list[FindingResponse] = []
    error_message: str | None
    report_s3_key: str | None


class ScanListResponse(BaseModel):
    items: list[ScanSummary]
    total: int
    page: int
    page_size: int


class FindingSuppressRequest(BaseModel):
    reason: str = Field(..., min_length=10)


class SecurityPostureResponse(BaseModel):
    organization_id: uuid.UUID
    overall_score: float
    trend: str  # "improving" | "stable" | "degrading"
    scans_this_month: int
    open_critical: int
    open_high: int
    open_medium: int
    open_low: int
    top_vulnerable_projects: list[dict]
    severity_breakdown: dict[str, int]
