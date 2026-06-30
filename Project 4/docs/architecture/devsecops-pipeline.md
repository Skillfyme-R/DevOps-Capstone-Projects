# ShieldGrid DevSecOps Pipeline Architecture

## Overview

ShieldGrid implements a DevSecOps pipeline inspired by four reference architecture patterns documented in the security engineering community:

1. **OWASP AppSec Rugged DevOps Pipeline** (2015) — parallel scanner orchestration with a normalised finding schema
2. **Jim Bird's DevOpsSec model** (2016) — security controls layered across all SDLC stages, not bolted on at the end
3. **Leo Garciga's NIST-aligned pipeline** (2017) — automation as the mechanism for preventing human error and complying with SP 800-series controls
4. **GitLab DevSecOps lifecycle** (2020) — security embedded natively in CI/CD so developers act on results without leaving their workflow

## Pipeline Stages

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                                │
│                                                                          │
│  [code] → [commit] → [push] → [pull request]                            │
│                                       │                                  │
│                          ┌────────────▼────────────┐                    │
│                          │    AUTOMATED PIPELINE    │                    │
│                          │                          │                    │
│  Stage 1: Pre-commit     │  • Secret detection      │                    │
│                          │  • Lint / format         │                    │
│                          │                          │                    │
│  Stage 2: CI (PR)        │  • Unit tests            │                    │
│                          │  • SAST (Semgrep/Bandit) │                    │
│                          │  • Dependency audit      │                    │
│                          │  • IaC scan (Checkov)    │                    │
│                          │  • Container build +     │                    │
│                          │    Trivy image scan      │                    │
│                          │                          │                    │
│  Stage 3: Merge → main   │  • Integration tests     │                    │
│                          │  • DAST (ZAP-style)      │                    │
│                          │  • Deploy to staging     │                    │
│                          │  • Smoke tests           │                    │
│                          │                          │                    │
│  Stage 4: Release tag    │  • Approval gate (env)   │                    │
│                          │  • Blue/green deploy     │                    │
│                          │  • Production smoke test │                    │
│                          │  • Automatic rollback    │                    │
│                          └──────────────────────────┘                    │
│                                                                          │
│  Stage 5: Runtime        • Prometheus alerting                           │
│                          • Grafana dashboards                            │
│                          • VPC flow log analysis                         │
│                          • Weekly scheduled audits                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## Scan Engine Architecture

The ShieldGrid Scan Engine follows the OWASP AppSec Pipeline pattern of running independent scanners concurrently and aggregating normalised findings:

```python
async def execute_scan(scan_job, target_path, target_url, image_name):
    tasks = [
        _run_sast_scanner(target_path, branch),        # Bandit / Semgrep
        _run_dependency_scanner(target_path),          # pip-audit / Snyk
        _run_secret_scanner(target_path),              # Gitleaks / truffleHog
        _run_container_scanner(image_name),            # Trivy
        _run_iac_scanner(target_path),                 # Checkov / tfsec
        _run_dast_scanner(target_url),                 # OWASP ZAP
    ]
    results = await asyncio.gather(*tasks)
    # Normalise → Finding schema → score → persist
```

Each scanner is:
- **Isolated** — failure of one scanner does not block others
- **Normalised** — all findings mapped to a common `RawFinding` dataclass
- **Scored** — a numeric security posture score (0–100) is derived from severity-weighted finding counts

## Security Score Formula

```
score = max(0, 100 − Σ(severity_weight × finding_count))

Weights: CRITICAL=20, HIGH=10, MEDIUM=5, LOW=2, INFO=0
```

A perfect-posture project scores 100. A project with a single critical finding scores 80. Ten critical findings saturate the floor at 0.

## Finding Lifecycle

```
DETECTED → ACTIVE → [SUPPRESSED (with reason)] → archived with scan
                  → [FALSE_POSITIVE (marked)]   → excluded from scoring
```

Suppressions require an auditable reason string (minimum 10 characters) and are stored permanently alongside the finding, enabling compliance audit trails.

## RBAC Model

| Role | Trigger Scans | Suppress Findings | Manage Projects | Manage Users |
|---|---|---|---|---|
| OWNER | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✗ |
| SECURITY_ENGINEER | ✓ | ✓ | ✗ | ✗ |
| DEVELOPER | ✓ | ✗ | ✗ | ✗ |
| VIEWER | ✗ | ✗ | ✗ | ✗ |

## Infrastructure Security Architecture

```
Internet
   │
   ▼ HTTPS (TLS 1.3)
  ALB ── WAFv2 ACL
   │
   ▼ (private subnet only)
  EKS Node Group
   │  Pod SecurityContext: non-root, readOnlyRootFilesystem, capabilities dropped
   │  NetworkPolicy: strict ingress/egress rules
   │
   ├─► API Pods (shieldgrid-api)
   │      IRSA → S3 (reports), KMS (decrypt secrets)
   │
   └─► Worker Pods (celery)
          IRSA → SQS/S3

  PostgreSQL (RDS Multi-AZ, encrypted, deletion-protected)
  Redis (ElastiCache, in-VPC only)
  S3 (private, SSE-KMS, lifecycle policies)
  VPC Flow Logs → S3 → Athena queries
```

## Compliance Alignment

The pipeline maps to standard security frameworks:

| Control Area | Framework Reference |
|---|---|
| Secure SDLC | NIST SP 800-218 (SSDF) |
| Vulnerability management | NIST SP 800-40 |
| Secret management | CIS Benchmarks 4.x |
| Container security | NIST SP 800-190 |
| Least privilege | NIST SP 800-53 AC-6 |
| Audit logging | SOC 2 CC7.2, NIST AU-2 |
| Dependency tracking | OWASP Top 10:A06 |
