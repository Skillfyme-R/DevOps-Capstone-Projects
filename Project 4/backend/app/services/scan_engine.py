"""
ShieldGrid Scan Engine — orchestrates security scanners and aggregates findings.
Inspired by the OWASP AppSec Pipeline pattern: each scanner runs independently
and results are normalised into a common Finding schema before persistence.
"""
import asyncio
import random
import time
import uuid
from dataclasses import dataclass, field

import structlog

from app.models.scan import Finding, Severity, ScanJob, ScanStatus, ScanType

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Scanner result DTOs
# ---------------------------------------------------------------------------


@dataclass
class RawFinding:
    title: str
    description: str
    severity: Severity
    scanner: str
    category: str
    file_path: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    cve_id: str | None = None
    cwe_id: str | None = None
    cvss_score: float | None = None
    remediation: str | None = None
    references: list[str] = field(default_factory=list)
    raw_output: dict = field(default_factory=dict)


@dataclass
class ScannerResult:
    scanner_name: str
    findings: list[RawFinding]
    duration_seconds: float
    error: str | None = None


# ---------------------------------------------------------------------------
# Individual scanner stubs (replace with real tool integrations)
# ---------------------------------------------------------------------------


async def _run_sast_scanner(target: str, branch: str) -> ScannerResult:
    """Static analysis via Bandit / Semgrep pattern."""
    start = time.monotonic()
    await asyncio.sleep(0.1)  # simulate I/O

    findings: list[RawFinding] = [
        RawFinding(
            title="SQL Injection via unsanitised query parameter",
            description=(
                "User-controlled input is concatenated directly into a SQL query "
                "without parameterisation, allowing an attacker to manipulate the query."
            ),
            severity=Severity.CRITICAL,
            scanner="shieldgrid-sast",
            category="injection",
            file_path="src/api/users.py",
            line_start=47,
            line_end=49,
            cwe_id="CWE-89",
            cvss_score=9.8,
            remediation="Use parameterised queries or an ORM with bound parameters.",
            references=["https://owasp.org/www-community/attacks/SQL_Injection"],
        ),
        RawFinding(
            title="Hard-coded cryptographic secret detected",
            description="A static secret key is embedded in source code, making it trivially extractable.",
            severity=Severity.HIGH,
            scanner="shieldgrid-sast",
            category="secrets",
            file_path="src/core/config.py",
            line_start=12,
            cwe_id="CWE-798",
            cvss_score=7.5,
            remediation="Rotate the secret and inject it via environment variables or a secrets manager.",
        ),
        RawFinding(
            title="Missing CSRF protection on state-changing endpoint",
            description="POST /api/settings does not validate a CSRF token, enabling cross-site request forgery.",
            severity=Severity.MEDIUM,
            scanner="shieldgrid-sast",
            category="csrf",
            file_path="src/api/settings.py",
            line_start=83,
            cwe_id="CWE-352",
            cvss_score=6.1,
            remediation="Implement CSRF token validation using a library such as python-csrf.",
        ),
    ]
    return ScannerResult(
        scanner_name="shieldgrid-sast",
        findings=findings,
        duration_seconds=time.monotonic() - start,
    )


async def _run_dependency_scanner(target: str) -> ScannerResult:
    """Dependency vulnerability check via OWASP Dependency-Check / Snyk pattern."""
    start = time.monotonic()
    await asyncio.sleep(0.1)

    findings: list[RawFinding] = [
        RawFinding(
            title="CVE-2023-44487: HTTP/2 Rapid Reset Attack in urllib3",
            description=(
                "The installed version of urllib3 (1.26.14) is affected by CVE-2023-44487. "
                "An attacker can send a sequence of RST_STREAM frames to exhaust server resources."
            ),
            severity=Severity.HIGH,
            scanner="shieldgrid-depcheck",
            category="vulnerable-dependency",
            cve_id="CVE-2023-44487",
            cvss_score=7.5,
            remediation="Upgrade urllib3 to >= 2.0.4.",
            references=["https://nvd.nist.gov/vuln/detail/CVE-2023-44487"],
        ),
        RawFinding(
            title="Outdated cryptography library with known vulnerabilities",
            description="cryptography==38.0.0 has multiple advisories; upgrade to >= 41.0.0.",
            severity=Severity.MEDIUM,
            scanner="shieldgrid-depcheck",
            category="vulnerable-dependency",
            cvss_score=5.9,
            remediation="Run `pip install --upgrade cryptography` and pin to the latest stable.",
        ),
    ]
    return ScannerResult(
        scanner_name="shieldgrid-depcheck",
        findings=findings,
        duration_seconds=time.monotonic() - start,
    )


async def _run_secret_scanner(target: str) -> ScannerResult:
    """Secret detection via truffleHog / gitleaks pattern."""
    start = time.monotonic()
    await asyncio.sleep(0.05)

    findings: list[RawFinding] = [
        RawFinding(
            title="AWS Access Key ID detected in commit history",
            description=(
                "An AWS Access Key ID (AKIA…) was found in git history at commit a1b2c3d. "
                "The key may still be active and granting unintended access to AWS resources."
            ),
            severity=Severity.CRITICAL,
            scanner="shieldgrid-secrets",
            category="leaked-credential",
            file_path=".env.backup",
            line_start=3,
            remediation=(
                "1. Revoke the key in IAM immediately. "
                "2. Rotate all dependent services. "
                "3. Purge the file from git history using git-filter-repo."
            ),
        ),
    ]
    return ScannerResult(
        scanner_name="shieldgrid-secrets",
        findings=findings,
        duration_seconds=time.monotonic() - start,
    )


async def _run_container_scanner(image: str) -> ScannerResult:
    """Container image scan via Trivy / Snyk Container pattern."""
    start = time.monotonic()
    await asyncio.sleep(0.15)

    findings: list[RawFinding] = [
        RawFinding(
            title="Container running as root",
            description="The Dockerfile does not define a non-root USER, violating least-privilege.",
            severity=Severity.HIGH,
            scanner="shieldgrid-container",
            category="container-misconfiguration",
            file_path="Dockerfile",
            line_start=1,
            remediation="Add `USER appuser` after creating the user in the Dockerfile.",
        ),
        RawFinding(
            title="Base image contains 12 known CVEs",
            description="node:18 includes OS packages with 3 critical and 9 high-severity CVEs.",
            severity=Severity.HIGH,
            scanner="shieldgrid-container",
            category="vulnerable-base-image",
            remediation="Switch to `node:18-alpine` and pin to a digest for reproducibility.",
        ),
    ]
    return ScannerResult(
        scanner_name="shieldgrid-container",
        findings=findings,
        duration_seconds=time.monotonic() - start,
    )


async def _run_iac_scanner(target: str) -> ScannerResult:
    """Infrastructure-as-Code scan via Checkov / tfsec pattern."""
    start = time.monotonic()
    await asyncio.sleep(0.08)

    findings: list[RawFinding] = [
        RawFinding(
            title="S3 bucket has public read ACL enabled",
            description=(
                "The Terraform resource `aws_s3_bucket.assets` sets `acl = \"public-read\"`, "
                "making all objects in the bucket publicly readable."
            ),
            severity=Severity.CRITICAL,
            scanner="shieldgrid-iac",
            category="cloud-misconfiguration",
            file_path="infrastructure/terraform/modules/s3/main.tf",
            line_start=14,
            remediation="Set `acl = \"private\"` and control access via bucket policies.",
        ),
        RawFinding(
            title="Security group allows unrestricted SSH ingress (0.0.0.0/0)",
            description="Port 22 is open to the entire internet, enabling brute-force attacks.",
            severity=Severity.HIGH,
            scanner="shieldgrid-iac",
            category="network-misconfiguration",
            file_path="infrastructure/terraform/modules/vpc/main.tf",
            line_start=88,
            remediation="Restrict SSH ingress to known CIDR ranges or use AWS Systems Manager Session Manager.",
        ),
        RawFinding(
            title="RDS instance has deletion protection disabled",
            description="The database can be dropped without additional confirmation.",
            severity=Severity.MEDIUM,
            scanner="shieldgrid-iac",
            category="data-protection",
            file_path="infrastructure/terraform/modules/rds/main.tf",
            line_start=32,
            remediation="Set `deletion_protection = true` in the RDS Terraform resource.",
        ),
    ]
    return ScannerResult(
        scanner_name="shieldgrid-iac",
        findings=findings,
        duration_seconds=time.monotonic() - start,
    )


async def _run_dast_scanner(target_url: str) -> ScannerResult:
    """Dynamic scan via OWASP ZAP pattern."""
    start = time.monotonic()
    await asyncio.sleep(0.2)

    findings: list[RawFinding] = [
        RawFinding(
            title="X-Content-Type-Options header missing",
            description="The response does not include X-Content-Type-Options: nosniff.",
            severity=Severity.LOW,
            scanner="shieldgrid-dast",
            category="security-headers",
            remediation="Add `X-Content-Type-Options: nosniff` to all HTTP responses.",
        ),
        RawFinding(
            title="Content Security Policy not configured",
            description="No CSP header detected; XSS attacks have no browser-level mitigation.",
            severity=Severity.MEDIUM,
            scanner="shieldgrid-dast",
            category="security-headers",
            remediation="Define a strict CSP using nonces or hashes for script-src.",
        ),
    ]
    return ScannerResult(
        scanner_name="shieldgrid-dast",
        findings=findings,
        duration_seconds=time.monotonic() - start,
    )


# ---------------------------------------------------------------------------
# Score calculator
# ---------------------------------------------------------------------------

_SEVERITY_WEIGHTS = {
    Severity.CRITICAL: 20,
    Severity.HIGH: 10,
    Severity.MEDIUM: 5,
    Severity.LOW: 2,
    Severity.INFO: 0,
}


def calculate_security_score(findings: list[RawFinding]) -> float:
    """Returns a posture score between 0 and 100 (100 = no issues)."""
    deductions = sum(_SEVERITY_WEIGHTS.get(f.severity, 0) for f in findings)
    return max(0.0, round(100.0 - deductions, 1))


# ---------------------------------------------------------------------------
# Public orchestrator
# ---------------------------------------------------------------------------


async def execute_scan(
    scan_job: ScanJob,
    target_path: str = ".",
    target_url: str | None = None,
    image_name: str | None = None,
) -> tuple[list[RawFinding], float]:
    """
    Run the appropriate set of scanners in parallel based on scan_type,
    then return aggregated findings and security score.
    """
    log = logger.bind(scan_id=str(scan_job.id), scan_type=scan_job.scan_type)
    log.info("scan_started")

    scan_type = scan_job.scan_type
    tasks: list[asyncio.Task] = []

    if scan_type in (ScanType.SAST, ScanType.FULL):
        tasks.append(asyncio.create_task(_run_sast_scanner(target_path, scan_job.branch)))
    if scan_type in (ScanType.DEPENDENCY, ScanType.FULL):
        tasks.append(asyncio.create_task(_run_dependency_scanner(target_path)))
    if scan_type in (ScanType.SECRET, ScanType.FULL):
        tasks.append(asyncio.create_task(_run_secret_scanner(target_path)))
    if scan_type in (ScanType.CONTAINER, ScanType.FULL):
        tasks.append(asyncio.create_task(_run_container_scanner(image_name or "app:latest")))
    if scan_type in (ScanType.IAC, ScanType.FULL):
        tasks.append(asyncio.create_task(_run_iac_scanner(target_path)))
    if scan_type in (ScanType.DAST, ScanType.FULL) and target_url:
        tasks.append(asyncio.create_task(_run_dast_scanner(target_url)))

    results: list[ScannerResult] = await asyncio.gather(*tasks, return_exceptions=False)

    all_findings: list[RawFinding] = []
    for result in results:
        if result.error:
            log.warning("scanner_error", scanner=result.scanner_name, error=result.error)
        else:
            all_findings.extend(result.findings)
            log.info(
                "scanner_completed",
                scanner=result.scanner_name,
                finding_count=len(result.findings),
                duration=result.duration_seconds,
            )

    score = calculate_security_score(all_findings)
    log.info("scan_completed", total_findings=len(all_findings), score=score)
    return all_findings, score
