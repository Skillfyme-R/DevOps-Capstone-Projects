# ShieldGrid — Security Posture Management Platform

> **Enterprise-grade DevSecOps SaaS platform** for continuous security scanning, vulnerability management, and organisation-wide security posture monitoring — designed to integrate seamlessly into modern software delivery pipelines.


---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Problem](#2-business-problem)
3. [Objectives](#3-objectives)
4. [Key Features](#4-key-features)
5. [Architecture](#5-architecture)
6. [Tech Stack](#6-tech-stack)
7. [Folder Structure](#7-folder-structure)
8. [Database Design](#8-database-design)
9. [API Documentation](#9-api-documentation)
10. [Security Implementation](#10-security-implementation)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Monitoring & Observability](#13-monitoring--observability)
14. [Installation & Setup](#14-installation--setup)
15. [Challenges & Learnings](#15-challenges--learnings)
16. [Future Enhancements](#16-future-enhancements)
17. [License](#17-license)

---

## 1. Project Overview

**ShieldGrid** is a multi-tenant, cloud-native Security Posture Management (SPM) platform built as a SaaS product. It provides engineering and security teams with a unified control plane to continuously scan codebases, container images, infrastructure definitions, and running applications for security vulnerabilities — and then aggregate those findings into an organisation-level security posture score.

| Attribute | Detail |
|---|---|
| **Product Name** | ShieldGrid |
| **Category** | Security Posture Management (SPM) / DevSecOps |
| **Deployment Model** | SaaS — containerised, cloud-native |
| **Target Users** | Security Engineers, DevOps Engineers, Engineering Managers, CTOs |
| **Access Model** | Multi-tenant, role-based (Owner, Admin, Security Engineer, Developer, Viewer) |
| **Primary Interface** | React dashboard + REST API |

### Business Value

ShieldGrid shifts security left — embedding it directly into the development workflow rather than treating it as a gate at release time. Teams get continuous, automated visibility into their security posture across every project, branch, and deployment, enabling them to fix vulnerabilities when they are cheapest to remediate.

---

## 2. Business Problem

Modern engineering organisations face a compounding security challenge:

- **Fragmented tooling** — SAST, DAST, dependency scanners, and secret detectors each produce separate reports in incompatible formats, requiring manual correlation.
- **No unified posture view** — Security teams cannot answer "what is our organisation's security health right now?" without spending hours aggregating data.
- **Late detection** — Vulnerabilities are typically found in staging or production where fix costs are 10–100× higher than at the code-commit stage.
- **Triage overhead** — Security findings are noisy; without suppression, false-positive management, and severity weighting, teams suffer alert fatigue.
- **Compliance pressure** — Regulatory frameworks (SOC 2, ISO 27001, PCI-DSS) require demonstrable, continuous security monitoring — which manual processes cannot provide.

ShieldGrid addresses all of these by providing a single, normalised platform that orchestrates multiple scanners in parallel, stores and versions all findings, and derives an actionable posture score that trends over time.

---

## 3. Objectives

### Primary Objectives
- Provide a single pane of glass for organisation-wide security posture.
- Automate vulnerability detection across six scanner categories in one trigger.
- Enable security finding triage (suppression, false-positive marking) without leaving the platform.

### Technical Objectives
- Build a production-grade async API capable of handling concurrent scan orchestration.
- Implement a normalised finding schema (OWASP AppSec Pipeline pattern) so scanner outputs are interchangeable.
- Deploy on Kubernetes with horizontal auto-scaling, zero-downtime rolling updates, and network-level micro-segmentation.
- Provide full infrastructure-as-code via Terraform for repeatable cloud provisioning.

### Business Objectives
- Reduce mean-time-to-detection (MTTD) for critical vulnerabilities from days to minutes.
- Enable engineering managers to demonstrate security posture improvement over time via trend analysis.
- Support multi-team, multi-project organisations via multi-tenancy with strict data isolation per organisation.

---

## 4. Key Features

| Feature | Description | Business Benefit |
|---|---|---|
| **Multi-Scanner Orchestration** | Runs SAST, DAST, Dependency, Secret, Container, and IaC scanners in parallel via `asyncio.gather` | Comprehensive coverage in a single scan trigger; no manual tool chaining |
| **Security Posture Score** | Weighted formula: `score = max(0, 100 − Σ(weight × count))` with CRITICAL=20, HIGH=10, MEDIUM=5, LOW=2 | Single actionable metric for executive reporting and SLA tracking |
| **Posture Trend Analysis** | Compares rolling averages of last 5 vs previous 5 scans to classify trend as Improving / Stable / Degrading | Early warning before a security regression reaches production |
| **Normalised Finding Schema** | All scanners emit `RawFinding` DTOs with CVE/CWE IDs, CVSS scores, file locations, and remediation guidance | Uniform triage experience regardless of the underlying scanner |
| **Finding Suppression** | Analysts can suppress findings with a documented reason; suppressed findings are excluded from scoring | Reduces alert fatigue; maintains audit trail for compliance |
| **Multi-Tenant RBAC** | Five roles (Owner → Viewer) with organisation-scoped data isolation at the database level | Safely onboard multiple teams; enforce least-privilege access |
| **Real-Time Notifications** | Bell panel derives live alerts from posture score, per-project criticals, and per-scan results | Immediate awareness without requiring manual dashboard checks |
| **JWT Authentication** | Short-lived access tokens (30 min) + refresh tokens (7 days) with HS256 signing | Secure, stateless auth compatible with SPAs and CI/CD pipelines |
| **Prometheus Metrics** | `/metrics` endpoint exposes custom application metrics via `prometheus-client` | Plug-in to any Grafana-based observability stack |
| **Kubernetes-Native Deployment** | HPA (2–20 replicas), rolling updates with `maxUnavailable: 0`, `NetworkPolicy` micro-segmentation | Production-grade availability and security isolation |
| **Terraform IaC** | VPC, EKS, RDS (PostgreSQL 16), ElastiCache, S3, IAM modules with environment overlays | Repeatable, auditable infrastructure provisioning; eliminates snowflake environments |
| **Async Database Layer** | SQLAlchemy 2 async ORM + asyncpg + Alembic migrations | Non-blocking I/O; migrations are version-controlled and reversible |
| **Docker Multi-Stage Builds** | Separate builder and runtime stages; non-root UID 1001; read-only root filesystem | Minimal attack surface; images are production-hardened |
| **Structured Logging** | `structlog` with JSON output in production and coloured console in development | Machine-parseable logs; correlatable across distributed services |

---

## 5. Architecture

### System Architecture

```mermaid
flowchart TB
    subgraph Client["Browser / API Client"]
        UI["React Dashboard\n(Vite + Tailwind)"]
        APICLI["REST Client / CI Pipeline"]
    end

    subgraph Docker["Docker Compose / Kubernetes Cluster"]
        direction TB

        subgraph Frontend["Frontend Service"]
            NGX["nginx:1.27\nStatic assets + API proxy"]
        end

        subgraph Backend["Backend Service"]
            API["FastAPI\n(uvicorn, 4 workers)"]
            SE["Scan Engine\n(asyncio orchestrator)"]
        end

        subgraph Scanners["Scanner Modules (parallel)"]
            S1["SAST\nshieldgrid-sast"]
            S2["DAST\nshieldgrid-dast"]
            S3["Dependencies\nshieldgrid-depcheck"]
            S4["Secrets\nshieldgrid-secrets"]
            S5["Container\nshieldgrid-container"]
            S6["IaC\nshieldgrid-iac"]
        end

        subgraph Data["Data Layer"]
            PG["PostgreSQL 16\n(asyncpg)"]
            RD["Redis 7\n(cache / broker)"]
        end

        subgraph Observability["Observability"]
            PROM["Prometheus"]
            GRAF["Grafana"]
        end
    end

    UI -->|HTTPS| NGX
    APICLI -->|HTTPS| NGX
    NGX -->|proxy /api/*| API
    API --> SE
    SE -->|parallel asyncio.gather| S1 & S2 & S3 & S4 & S5 & S6
    S1 & S2 & S3 & S4 & S5 & S6 -->|RawFinding| SE
    SE -->|persist findings + score| API
    API <-->|async ORM| PG
    API <-->|cache / session| RD
    API -->|/metrics| PROM
    PROM --> GRAF
```

### Request Flow — Scan Execution

```mermaid
sequenceDiagram
    participant User as Browser
    participant Nginx as nginx (Dashboard)
    participant API as FastAPI
    participant Engine as Scan Engine
    participant DB as PostgreSQL

    User->>Nginx: POST /api/v1/scans (JWT)
    Nginx->>API: proxy request
    API->>API: validate JWT, resolve user
    API->>DB: INSERT scan_job (status=running)
    API->>Engine: execute_scan(scan_job)
    par parallel scanners
        Engine->>Engine: _run_sast_scanner()
        Engine->>Engine: _run_dependency_scanner()
        Engine->>Engine: _run_secret_scanner()
        Engine->>Engine: _run_container_scanner()
        Engine->>Engine: _run_iac_scanner()
    end
    Engine->>Engine: calculate_security_score(findings)
    Engine-->>API: (findings[], score)
    API->>DB: INSERT findings, UPDATE scan_job (completed, score)
    API-->>Nginx: 202 ScanSummary JSON
    Nginx-->>User: response
```

### Security Score Formula

```
score = max(0, 100 − Σ(severity_weight × finding_count))

Weights: CRITICAL=20 | HIGH=10 | MEDIUM=5 | LOW=2 | INFO=0
```

---

## 6. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | Component-based UI framework |
| TypeScript | 5.5 | Static typing for reliability |
| Vite | 5 | Build tool and dev server |
| Tailwind CSS | 3 | Utility-first styling |
| TanStack Query | 5 | Server state management and caching |
| Zustand | 4 | Client state (auth store) |
| React Router | 6 | SPA client-side routing |
| Recharts | 2 | Data visualisation (pie/bar charts) |
| React Hook Form | 7 | Form state management |
| Zod | 3 | Runtime schema validation |
| Axios | 1 | HTTP client with interceptors |
| date-fns | 3 | Date formatting |
| Lucide React | — | Icon library |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | 0.111 | Async REST API framework |
| Uvicorn | 0.30 | ASGI server |
| SQLAlchemy | 2.0 | Async ORM with mapped column syntax |
| Alembic | 1.13 | Database schema migration |
| asyncpg | 0.29 | Async PostgreSQL driver |
| Pydantic v2 | 2.8 | Request/response validation and settings |
| pydantic-settings | 2.3 | Environment-based configuration |
| python-jose | 3.3 | JWT encoding/decoding (HS256) |
| passlib + bcrypt | 1.7 / 4.0 | Password hashing |
| structlog | 24.4 | Structured JSON logging |
| prometheus-client | 0.20 | Metrics exposure |
| httpx | 0.27 | Async HTTP client |
| tenacity | 8.5 | Retry logic |
| python-slugify | 8.0 | URL-safe slug generation |
| Celery | 5.4 | Async task queue (infrastructure-ready) |

### Database

| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 16 | Primary relational store |
| Redis | 7 | Cache, session store, Celery broker |

### Infrastructure & DevOps

| Technology | Purpose |
|---|---|
| Docker | Container runtime; multi-stage builds for frontend and backend |
| Docker Compose | Local orchestration (6 services) with override file for dev hot-reload |
| Kubernetes (EKS) | Production container orchestration |
| Kustomize | Kubernetes manifest management (base + prod overlays) |
| Terraform | Cloud infrastructure provisioning (VPC, EKS, RDS, S3, IAM) |
| AWS EKS | Managed Kubernetes control plane |
| AWS RDS | Managed PostgreSQL 16 (Multi-AZ, encrypted, Performance Insights) |
| AWS VPC | Network isolation (public/private subnets, NAT gateway, VPC Flow Logs) |
| AWS S3 | Scan report storage with lifecycle policies |
| AWS ALB + WAF | Load balancing, TLS termination, web application firewall |
| GitHub Actions | CI/CD — lint, test, security scan, Docker build, deploy |

### Monitoring

| Technology | Purpose |
|---|---|
| Prometheus | Metrics collection (scrapes `/metrics` every 15s) |
| Grafana | Metrics visualisation and dashboards |

---

## 7. Folder Structure

```text
Project 4/
├── backend/                        # FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/      # auth.py, health.py, projects.py, scans.py
│   │   ├── core/                   # config.py, database.py, logging.py, security.py
│   │   ├── models/                 # SQLAlchemy ORM models (user.py, scan.py)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── auth_service.py     # Registration, login, slug generation
│   │   │   ├── scan_engine.py      # Parallel scanner orchestration
│   │   │   └── posture_service.py  # Organisation posture aggregation
│   │   └── utils/
│   │       └── dependencies.py     # JWT auth, RBAC dependency injection
│   ├── migrations/                 # Alembic migration versions
│   ├── tests/                      # Unit tests (scan engine)
│   ├── Dockerfile                  # Multi-stage: builder → runtime (UID 1001)
│   ├── requirements.txt            # Pinned dependencies
│   └── .env.example                # Environment variable reference
│
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/             # Logo, StatusBadge, SeverityBadge, NotificationPanel
│   │   │   ├── dashboard/          # PostureScore, SeverityChart, RecentScans
│   │   │   ├── reports/            # FindingsTable
│   │   │   └── scanner/            # TriggerScanModal
│   │   ├── hooks/                  # useScans.ts, useProjects.ts (TanStack Query)
│   │   ├── pages/                  # LoginPage, DashboardPage, ProjectsPage, ScansPage, ScanDetailPage
│   │   ├── store/                  # authStore.ts (Zustand + persist)
│   │   ├── types/                  # index.ts (TypeScript interfaces)
│   │   └── utils/                  # api.ts (Axios client), severity.ts, cn.ts
│   ├── Dockerfile                  # Multi-stage: node builder → nginx runtime
│   ├── nginx.conf                  # SPA routing, API proxy, security headers
│   └── package.json
│
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── vpc/                # VPC, subnets, NAT gateways, route tables, flow logs
│   │   │   ├── eks/                # EKS cluster, node groups, OIDC, IAM roles
│   │   │   ├── rds/                # PostgreSQL 16, parameter group, KMS encryption
│   │   │   └── s3/                 # Report storage bucket
│   │   └── environments/
│   │       └── prod/               # Production environment root module
│   ├── kubernetes/
│   │   ├── base/                   # Deployment, Service, HPA, Ingress, NetworkPolicy, ConfigMap
│   │   └── overlays/
│   │       └── prod/               # Production patches (replica count, resource limits)
│   ├── prometheus.yml              # Scrape configuration
│   └── grafana/
│       └── provisioning/           # Auto-provisioned Grafana datasources
│
├── cicd/                           # CI/CD pipeline definitions (GitHub Actions workflows)
│
├── scripts/
│   ├── init-db.sql                 # PostgreSQL extensions (uuid-ossp, pg_trgm)
│   └── bootstrap-local.sh          # One-command local environment setup
│
├── docs/
│   ├── api/                        # API overview documentation
│   ├── architecture/               # DevSecOps pipeline documentation
│   └── guides/                     # Deployment guide
│
├── docker-compose.yml              # Full stack: postgres, redis, api, dashboard, prometheus, grafana
└── docker-compose.override.yml     # Dev: hot-reload for API, worker disabled
```

---

## 8. Database Design

### Database Overview

ShieldGrid uses PostgreSQL 16 as its primary data store. All IDs are UUID v4 (generated by `uuid-ossp`). All tables include `created_at` and `updated_at` timestamp columns. The schema is managed via Alembic versioned migrations. Two PostgreSQL extensions are pre-installed: `uuid-ossp` for UUID generation and `pg_trgm` for future full-text search on findings.

### Entity Relationship Diagram

```mermaid
erDiagram
    ORGANIZATIONS {
        uuid id PK
        string name
        string slug UK
        string plan
        bool is_active
        int max_scans_per_month
        text webhook_url
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        string role
        bool is_active
        bool is_verified
        uuid organization_id FK
        timestamp created_at
        timestamp updated_at
    }

    PROJECTS {
        uuid id PK
        string name
        string slug
        text description
        text repository_url
        string default_branch
        bool is_active
        uuid organization_id FK
        timestamp created_at
        timestamp updated_at
    }

    SCAN_JOBS {
        uuid id PK
        uuid project_id FK
        uuid triggered_by FK
        string scan_type
        string status
        string branch
        string commit_sha
        text target_url
        float security_score
        int critical_count
        int high_count
        int medium_count
        int low_count
        int info_count
        int duration_seconds
        text error_message
        text report_s3_key
        timestamp created_at
        timestamp updated_at
    }

    FINDINGS {
        uuid id PK
        uuid scan_id FK
        string title
        text description
        string severity
        string scanner
        string category
        text file_path
        int line_start
        int line_end
        string cve_id
        string cwe_id
        float cvss_score
        text remediation
        jsonb references
        jsonb raw_output
        bool is_suppressed
        text suppression_reason
        bool is_false_positive
        timestamp created_at
        timestamp updated_at
    }

    ORGANIZATIONS ||--o{ USERS : "has members"
    ORGANIZATIONS ||--o{ PROJECTS : "owns"
    PROJECTS ||--o{ SCAN_JOBS : "has scans"
    USERS ||--o{ SCAN_JOBS : "triggers"
    SCAN_JOBS ||--o{ FINDINGS : "produces"
```

### Tables

| Table | Purpose | Key Indexes |
|---|---|---|
| `organizations` | Multi-tenant root entity; holds plan and quota data | `slug` (unique) |
| `users` | Platform users with hashed passwords and RBAC roles | `email` (unique), `organization_id` |
| `projects` | Code repositories registered for scanning | `slug`, `organization_id` |
| `scan_jobs` | Individual scan executions with aggregated severity counts | `status`, `project_id`, `created_at` |
| `findings` | Individual vulnerability findings with full metadata | `severity`, `scan_id`, `is_suppressed` |

### Indexing Strategy

| Index | Type | Reason |
|---|---|---|
| `ix_organizations_slug` | Unique B-Tree | Fast organisation lookup during authentication |
| `ix_users_email` | Unique B-Tree | Login performance and duplicate prevention |
| `ix_projects_slug` | B-Tree | Fast project lookup within an organisation |
| `ix_scan_jobs_status` | B-Tree | Efficient filtering of active/queued scans |
| `ix_findings_severity` | B-Tree | Fast severity-based aggregation for posture calculations |

---

## 9. API Documentation

### API Overview

The ShieldGrid REST API is versioned under `/api/v1`. All endpoints require JWT Bearer authentication except `/auth/login`, `/auth/register`, and `/api/v1/health`. Interactive documentation is available at `/docs` (Swagger UI) and `/redoc` in non-production environments.

**Base URL (local):** `http://localhost:8010/api/v1`

### Authentication

```
Authorization: Bearer <access_token>
```

Access tokens expire in 30 minutes. Use the refresh token to obtain a new access token when it expires.

### Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Liveness check — returns status, version, environment |
| `POST` | `/auth/register` | None | Register organisation and first user; returns token pair |
| `POST` | `/auth/login` | None | Authenticate and receive JWT token pair |
| `GET` | `/auth/me` | JWT | Return current authenticated user's profile |
| `POST` | `/projects` | JWT | Create a new project |
| `GET` | `/projects` | JWT | List all projects in the organisation (paginated) |
| `GET` | `/projects/{id}` | JWT | Get project detail |
| `PATCH` | `/projects/{id}` | JWT | Update project metadata |
| `DELETE` | `/projects/{id}` | JWT | Archive (soft-delete) a project |
| `POST` | `/scans` | JWT | Trigger a security scan (returns `202 Accepted`) |
| `GET` | `/scans` | JWT | List scans — filterable by `project_id`, paginated |
| `GET` | `/scans/posture` | JWT | Organisation security posture summary |
| `GET` | `/scans/{id}` | JWT | Full scan detail including all findings |
| `POST` | `/scans/{id}/findings/{fid}/suppress` | JWT | Suppress a finding with documented reason |
| `GET` | `/metrics` | None | Prometheus metrics endpoint |

### Request Example — Trigger Scan

```json
POST /api/v1/scans
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "c3fb3d70-6e77-4d65-aa70-4ec317166532",
  "scan_type": "full",
  "branch": "main",
  "target_url": "https://staging.example.com"
}
```

### Response Example — Security Posture

```json
GET /api/v1/scans/posture

{
  "organization_id": "fae607c2-718b-4990-a688-75b6cd5e1ee9",
  "overall_score": 41.2,
  "trend": "stable",
  "scans_this_month": 4,
  "open_critical": 6,
  "open_high": 13,
  "open_medium": 7,
  "open_low": 0,
  "top_vulnerable_projects": [
    { "project_id": "...", "score": 28.0, "critical": 3 }
  ],
  "severity_breakdown": {
    "critical": 6, "high": 13, "medium": 7, "low": 0, "info": 0
  }
}
```

### Error Reference

| HTTP Status | Meaning |
|---|---|
| `400` | Validation error — malformed request body |
| `401` | Unauthenticated — missing or expired JWT |
| `403` | Forbidden — insufficient RBAC role |
| `404` | Resource not found |
| `409` | Conflict — e.g. duplicate email on registration |
| `422` | Unprocessable entity — Pydantic schema violation |
| `500` | Internal server error — logged with structlog, sanitised response to client |

---

## 10. Security Implementation

### Authentication & Session Management

- **JWT HS256** with separate access (30 min) and refresh (7 day) tokens
- Tokens are validated on every request via FastAPI dependency injection (`get_current_user`)
- Passwords are hashed with **bcrypt** (cost factor 12) via passlib — plaintext is never stored or logged

### Role-Based Access Control (RBAC)

```mermaid
graph LR
    Owner --> Admin --> SecurityEngineer["Security Engineer"] --> Developer --> Viewer
    Owner -->|"full permissions"| DB[(Database)]
    Viewer -->|"read-only"| DB
```

| Role | Capabilities |
|---|---|
| Owner | Full access; manage organisation, billing, members |
| Admin | Manage projects, trigger scans, manage findings |
| Security Engineer | Trigger scans, suppress findings, view all data |
| Developer | Trigger scans on own projects, view findings |
| Viewer | Read-only access to all data |

### API Security Headers (nginx)

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | `default-src 'self'; connect-src 'self'; ...` |

### Additional Controls

| Control | Implementation |
|---|---|
| CORS | `CORSMiddleware` restricts origins to the `ALLOWED_ORIGINS` env whitelist; no wildcards |
| Rate limiting | Configurable per-endpoint limits via `RATE_LIMIT_REQUESTS` + `RATE_LIMIT_WINDOW_SECONDS` env vars |
| Input validation | All inputs validated via Pydantic v2 before reaching business logic |
| Token revocation | Axios interceptor auto-logs out on `401` to prevent stale token access |
| Container security | Non-root (UID 1001), read-only root filesystem, all capabilities dropped, seccomp RuntimeDefault |
| Network policy | Deny-all by default; explicit whitelist for pod-to-pod paths only |
| Secrets | Never committed; injected via environment; AWS Secrets Manager for production |
| Supply chain | Docker Buildx provenance + SBOM generation; Trivy image scan in CI |
| Encryption at rest | RDS encrypted with customer-managed KMS; S3 SSE-KMS |
| Encryption in transit | TLS 1.3 via ALB; database connections use SSL mode |

### OWASP Coverage

The scan engine explicitly detects and reports on OWASP Top 10 categories: SQL Injection (CWE-89), Hard-coded Credentials (CWE-798), CSRF (CWE-352), Security Misconfiguration, Vulnerable/Outdated Components, Broken Access Control, and Cryptographic Failures.

---

## 11. CI/CD Pipeline

### Pipeline Overview

Every pull request and main-branch merge flows through a multi-stage automated pipeline defined as GitHub Actions workflows.

```mermaid
flowchart LR
    PR["Pull Request"] --> Lint["Lint &\nType Check"]
    Lint --> Test["Unit &\nIntegration Tests"]
    Test --> Scan["Security\nScan"]
    Scan --> Build["Docker\nBuild + Push"]
    Build --> Staging["Auto-Deploy\nStaging"]
    Staging --> Gate{{"Approval\nGate"}}
    Gate -->|approved| Prod["Deploy\nProduction"]
    Gate -->|rejected| Stop(["Stop"])
    Prod -->|failure| Rollback["Auto Rollback\n+ Slack Alert"]
```

### Workflow: `ci.yml` — Pull Request Checks

| Job | Tools | Purpose |
|---|---|---|
| `backend-lint` | ruff, mypy | Python code style and type safety |
| `backend-test` | pytest + PostgreSQL + Redis services | Unit and integration tests with real database |
| `frontend-lint` | ESLint, TypeScript compiler | JS/TS code quality |
| `frontend-test` | Vitest | Component and hook tests |
| `security-scan` | Trivy (SARIF → GitHub Security), Gitleaks | Container image vulnerabilities, secret detection |
| `docker-build` | Docker Buildx | Verify images build cleanly; generate SBOM |

### Workflow: `deploy.yml` — Continuous Deployment

| Stage | Trigger | Action |
|---|---|---|
| Staging deploy | Merge to `main` | Auto-deploy to staging EKS namespace; run smoke tests |
| Production deploy | Push version tag `v*.*.*` | Environment approval gate → rolling deploy → smoke tests |
| Rollback | Smoke test failure | `kubectl rollout undo`; Slack alert to on-call channel |

### Workflow: `security-audit.yml` — Weekly Scan

Runs every Monday at 08:00 UTC:
- `pip-audit` for Python dependency CVEs
- `npm audit` for Node dependency CVEs
- Checkov for Terraform and Kubernetes IaC misconfigurations
- License compliance check for copyleft dependencies

---

## 12. Deployment Architecture

### Local Development (Docker Compose)

```mermaid
flowchart LR
    subgraph Host["Developer Machine"]
        Browser -->|":3001"| NGX
        DevTools -->|":8010"| API
        DevTools -->|":9090"| PROM
        DevTools -->|":4001"| GRAF
    end

    subgraph Compose["docker-compose (shieldgrid network)"]
        NGX["dashboard\nnginx:3001"]
        API["api\nuvicorn:8010\n--reload"]
        PG["postgres\n:5435"]
        RD["redis\n:6380"]
        PROM["prometheus\n:9090"]
        GRAF["grafana\n:4001"]
    end

    NGX -->|"proxy /api/*"| API
    API --> PG & RD
    PROM -->|"scrape /metrics"| API
    GRAF --> PROM
```

The `docker-compose.override.yml` activates hot-reload (`--reload`) and disables the Celery worker for local development — no cloud accounts required.

### Production (AWS / Kubernetes)

```mermaid
flowchart TB
    Internet(("Internet")) --> WAF["AWS WAF\n(OWASP ruleset)"]
    WAF --> ALB["Application Load Balancer\n(TLS 1.3, ACM cert)"]

    subgraph VPC["AWS VPC (Multi-AZ — 3 availability zones)"]
        subgraph Public["Public Subnets"]
            ALB
        end

        subgraph Private["Private Subnets"]
            subgraph EKS["EKS Cluster (v1.29)"]
                subgraph NS["namespace: shieldgrid"]
                    ING["Ingress (ALB Controller)"]
                    API_POD["API Pods\n(2–20 replicas, HPA)"]
                    DASH_POD["Dashboard Pods"]
                end
            end

            RDS["RDS PostgreSQL 16\n(Multi-AZ, encrypted)"]
            ELASTICACHE["ElastiCache Redis\n(cluster mode)"]
        end
    end

    S3["S3\n(scan reports)"]
    CW["CloudWatch\n(logs, metrics)"]

    ALB --> ING
    ING --> API_POD & DASH_POD
    API_POD --> RDS
    API_POD --> ELASTICACHE
    API_POD --> S3
    EKS --> CW
```

### Kubernetes Resource Summary

| Resource | Configuration |
|---|---|
| Deployment | 2 replicas minimum; `RollingUpdate` with `maxUnavailable: 0` |
| HPA | Min 2 / Max 20 replicas; scale on CPU >65% or Memory >80% |
| Ingress | AWS ALB, TLS 1.3, WAF ACL, HTTP→HTTPS redirect |
| NetworkPolicy | Deny-all by default; whitelist only required pod-to-pod paths |
| Init Container | Runs `alembic upgrade head` before main container starts on each deploy |
| Security Context | Non-root (UID 1001), read-only filesystem, all capabilities dropped, `seccompProfile: RuntimeDefault` |
| Topology Spread | `maxSkew: 1` across availability zones for resilience |

### Terraform Modules

| Module | Resources Managed |
|---|---|
| `vpc` | VPC, public/private subnets (3 AZs), NAT gateways, route tables, ALB security group, VPC Flow Logs (Parquet format) |
| `eks` | EKS cluster (v1.29), system + application node groups, OIDC provider (IRSA), IAM roles, KMS encryption for secrets |
| `rds` | PostgreSQL 16 instance, parameter group, subnet group, KMS encryption, Performance Insights enabled, CloudWatch logs |
| `s3` | Report storage bucket with versioning, SSE-KMS encryption, lifecycle rules |

---

## 13. Monitoring & Observability

### Metrics (Prometheus + Grafana)

Prometheus scrapes the API's `/metrics` endpoint every 15 seconds. Grafana is auto-provisioned with the Prometheus datasource via the `provisioning/` directory — no manual setup required.

```yaml
# infrastructure/prometheus.yml (simplified)
scrape_configs:
  - job_name: shieldgrid-api
    static_configs:
      - targets: ["api:8000"]
  - job_name: postgres
    static_configs:
      - targets: ["postgres-exporter:9187"]
  - job_name: redis
    static_configs:
      - targets: ["redis-exporter:9121"]
```

| Metric Source | What is Collected |
|---|---|
| FastAPI application | Request count, latency histograms, error rates per endpoint |
| PostgreSQL | Connection pool stats, query performance, table sizes |
| Redis | Memory usage, command throughput, hit/miss rates |
| Prometheus self | Scrape health, rule evaluation duration |

**Grafana:** `http://localhost:4001` — default credentials: `admin` / `shieldgrid`

### Logging (structlog)

ShieldGrid uses `structlog` with a pure `PrintLoggerFactory` pipeline — no stdlib wrappers — ensuring compatibility across all log levels.

| Environment | Format |
|---|---|
| Development | Coloured console output (`ConsoleRenderer`) for human readability |
| Production | Structured JSON output — each log line is a parseable event |

Every log entry includes: `timestamp` (ISO 8601), `level`, and contextual fields (request ID, user ID, scan ID as applicable).

### Application-Level Alerting

The ShieldGrid dashboard itself acts as a real-time monitoring surface through the notification panel:

- **Posture score critical** — fires when organisation score drops below 50
- **Posture degrading** — fires when trend classification is "degrading"
- **Open criticals** — fires when there are unresolved critical findings org-wide
- **Per-project critical** — fires for each project with critical findings
- **Per-scan** — fires on scan failure, scan with criticals/highs, or clean scan (score ≥ 90)

---

## 14. Installation & Setup

### Prerequisites

| Requirement | Version |
|---|---|
| Docker Desktop | 4.x+ |
| Docker Compose | v2 (included with Docker Desktop) |
| Git | Any recent version |

> No AWS account, no local Python/Node installation required. Everything runs inside Docker.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Project 4"
```

### 2. Start All Services

```bash
docker compose up -d
```

This starts 6 containers: PostgreSQL, Redis, FastAPI, React Dashboard, Prometheus, and Grafana.

### 3. Run Database Migrations (first time only)

```bash
docker exec shieldgrid-api alembic upgrade head
```

### 4. Register Your First Account

```bash
curl -s -X POST http://localhost:8010/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@company.com",
    "password": "SecurePass@123",
    "full_name": "Your Name",
    "organization_name": "Your Organisation"
  }'
```

### 5. Access the Platform

| Service | URL | Credentials |
|---|---|---|
| **Dashboard** | http://localhost:3001 | Your registered email + password |
| **API (Swagger UI)** | http://localhost:8010/docs | — |
| **Prometheus** | http://localhost:9090 | — |
| **Grafana** | http://localhost:4001 | `admin` / `shieldgrid` |

### Environment Variables Reference

Copy `.env.example` to `.env` and configure as needed:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing key (min 32 chars) | `dev-secret-key-change-in-production` |
| `DATABASE_URL` | PostgreSQL async DSN | `postgresql+asyncpg://shieldgrid:shieldgrid@postgres:5432/shieldgrid` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379/0` |
| `ALLOWED_ORIGINS` | JSON array of permitted CORS origins | `["http://localhost:3001"]` |
| `ENVIRONMENT` | `development` / `staging` / `production` | `development` |
| `PROMETHEUS_ENABLED` | Expose `/metrics` endpoint | `true` |

> **Important:** `ALLOWED_ORIGINS` must be a valid JSON array string, not a comma-separated list.

### Stop All Services

```bash
docker compose down          # stop and remove containers
docker compose down -v       # also remove volumes (wipes database)
```

---

## 15. Challenges & Learnings

### Technical Challenges Encountered

**1. Pydantic v2 + pydantic-settings list field parsing**

`ALLOWED_ORIGINS` is a `list[AnyHttpUrl]` field. pydantic-settings v2 attempts `json.loads()` on list fields *before* any custom `field_validator` runs, meaning a comma-separated string causes a JSON parse error regardless of a validator. The fix was to set the env var value as a valid JSON array string: `'["http://localhost:3001"]'`. A subtle companion issue: `docker restart` reuses the container's cached env — `docker compose up --force-recreate` is required to pick up changed env values.

**2. structlog `PrintLoggerFactory` vs stdlib processor mismatch**

The initial logging configuration mixed `ProcessorFormatter.wrap_for_formatter` (a stdlib bridge helper) with `PrintLoggerFactory`. `PrintLogger` has no `.name` attribute and does not accept an `extra` keyword argument, causing `AttributeError` and `TypeError` at startup. The fix was to use a pure `PrintLoggerFactory` pipeline with no stdlib-style processors, removing `add_logger_name` and `wrap_for_formatter` entirely.

**3. bcrypt version incompatibility with passlib**

`passlib[bcrypt]==1.7.4` installs the latest `bcrypt` (4.1+) which changed its internal C API. This caused `ValueError: password cannot be longer than 72 bytes` even for short passwords — a misleading error. The fix was to pin `bcrypt==4.0.1` explicitly in `requirements.txt`, which is the last version compatible with passlib 1.7.x.

**4. `python-slugify` import name vs package name**

The PyPI package `python-slugify` installs as the Python module `slugify`, not `python_slugify`. `from python_slugify import slugify` raises `ModuleNotFoundError` at runtime despite the package being installed. The correct import is `from slugify import slugify`.

**5. React Portal for overflow-clipped dropdown**

The notification panel was rendered inside `flex-col overflow-hidden` container. Despite `z-50`, the CSS overflow clip on the ancestor completely hid the panel — z-index does not override overflow clipping in the same stacking context. The fix was `ReactDOM.createPortal()` to render directly onto `document.body` at computed fixed coordinates from the trigger button's `getBoundingClientRect()`.

**6. Port conflict management**

Multiple Docker Compose projects were simultaneously occupying standard ports (5432, 6379, 3000, 8000). All ShieldGrid services were systematically remapped to free ports (5435, 6380, 3001, 8010) without changing any internal service-to-service networking — Docker's internal DNS still resolves `postgres:5432` correctly within the shared network.

### Architecture Learnings

- **Async-first from the start**: SQLAlchemy 2 async has a fundamentally different session management model from sync. Starting async avoids a painful mid-project migration.
- **Normalised finding schema pays dividends**: By defining `RawFinding` as the universal output DTO for all scanners, adding a new scanner category requires zero changes to the persistence layer.
- **Override files for environment parity**: `docker-compose.override.yml` is auto-merged by Docker Compose, keeping the base `docker-compose.yml` identical across environments while isolating dev conveniences.
- **NetworkPolicy is deny-all only with both directions declared**: Omitting either `Ingress` or `Egress` from `policyTypes` silently permits all traffic in that direction — not the expected behaviour.

---

## 16. Future Enhancements

| Enhancement | Priority | Business Impact |
|---|---|---|
| **Real scanner integrations** (Semgrep, Trivy, Gitleaks, Checkov, OWASP ZAP) | High | Replace simulation stubs with actual tool output for production-grade findings |
| **GitHub / GitLab webhooks** | High | Trigger scans automatically on every push or pull request — true shift-left integration |
| **Celery async scan execution** | Medium | Decouple scan execution from the HTTP request lifecycle; support long-running scans without timeout |
| **Scan report export (PDF/JSON)** | Medium | Compliance teams can export findings for audit evidence; S3 storage is already wired |
| **Slack / email notifications** | Medium | Notify engineers immediately when critical findings are detected; webhook config is already in `.env.example` |
| **SSO / SAML 2.0 / OIDC login** | Medium | Enterprise customers require integration with Okta, Azure AD, or Google Workspace |
| **Finding deduplication** | Medium | Hash-based fingerprinting to avoid re-alerting on known findings across scan runs |
| **Policy-as-Code engine** | Medium | Define custom severity overrides and suppression rules as YAML policies |
| **AI-assisted remediation** | Low | LLM-generated context-aware fix suggestions for each finding, leveraging CVE/CWE metadata |
| **Multi-region deployment** | Low | Terraform modules are already parameterised for multi-environment; extend to multi-region for data sovereignty |
| **Immutable audit log** | Low | Append-only, timestamped record of all user actions for SOC 2 Type II compliance evidence |

---

## 17. License

Learnsyte Learning Private Limited **(Skillfyme)**
