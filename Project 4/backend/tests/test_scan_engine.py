"""Unit tests for ShieldGrid scan engine."""
import asyncio
import uuid
from unittest.mock import MagicMock

import pytest

from app.models.scan import ScanJob, ScanStatus, ScanType
from app.services.scan_engine import (
    Severity,
    RawFinding,
    calculate_security_score,
    execute_scan,
)


def make_scan_job(scan_type: ScanType = ScanType.SAST) -> ScanJob:
    job = MagicMock(spec=ScanJob)
    job.id = uuid.uuid4()
    job.scan_type = scan_type
    job.branch = "main"
    job.status = ScanStatus.RUNNING
    return job


class TestSecurityScoreCalculation:
    def test_perfect_score_no_findings(self) -> None:
        assert calculate_security_score([]) == 100.0

    def test_single_critical_deducts_20(self) -> None:
        findings = [
            RawFinding(
                title="Critical issue",
                description="desc",
                severity=Severity.CRITICAL,
                scanner="test",
                category="test",
            )
        ]
        assert calculate_security_score(findings) == 80.0

    def test_score_floored_at_zero(self) -> None:
        findings = [
            RawFinding(
                title=f"Issue {i}",
                description="desc",
                severity=Severity.CRITICAL,
                scanner="test",
                category="test",
            )
            for i in range(10)
        ]
        assert calculate_security_score(findings) == 0.0

    def test_mixed_severity_calculation(self) -> None:
        findings = [
            RawFinding("c", "d", Severity.CRITICAL, "t", "t"),  # -20
            RawFinding("h", "d", Severity.HIGH, "t", "t"),      # -10
            RawFinding("m", "d", Severity.MEDIUM, "t", "t"),    # -5
        ]
        assert calculate_security_score(findings) == 65.0

    def test_info_findings_no_deduction(self) -> None:
        findings = [
            RawFinding("i", "d", Severity.INFO, "t", "t"),
        ]
        assert calculate_security_score(findings) == 100.0


@pytest.mark.asyncio
class TestScanExecution:
    async def test_sast_scan_returns_findings(self) -> None:
        job = make_scan_job(ScanType.SAST)
        findings, score = await execute_scan(job)
        assert len(findings) > 0
        assert 0.0 <= score <= 100.0

    async def test_full_scan_includes_multiple_scanners(self) -> None:
        job = make_scan_job(ScanType.FULL)
        findings, score = await execute_scan(job, target_url="http://localhost:3000")
        scanners = {f.scanner for f in findings}
        assert len(scanners) > 1

    async def test_dependency_scan_returns_cve_findings(self) -> None:
        job = make_scan_job(ScanType.DEPENDENCY)
        findings, _ = await execute_scan(job)
        cve_findings = [f for f in findings if f.cve_id]
        assert len(cve_findings) > 0

    async def test_score_degrades_with_critical_findings(self) -> None:
        job = make_scan_job(ScanType.FULL)
        findings, score = await execute_scan(job, target_url="http://localhost:3000")
        critical = [f for f in findings if f.severity == Severity.CRITICAL]
        if critical:
            assert score < 100.0
