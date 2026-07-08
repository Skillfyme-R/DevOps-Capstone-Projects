# DeployPilot — Cloud Infrastructure Automation SaaS Platform

> **CloudForge Technologies** | Enterprise-Grade IaC Automation at Scale

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Problem](#2-business-problem)
3. [Objectives](#3-objectives)
4. [Key Features](#4-key-features)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Project Structure](#7-project-structure)
8. [Database Design](#8-database-design)
9. [API Documentation](#9-api-documentation)
10. [Security Implementation](#10-security-implementation)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Monitoring & Logging](#13-monitoring--logging)
14. [Installation & Setup](#14-installation--setup)
15. [Screenshots & Demo](#15-screenshots--demo)
16. [Challenges & Learnings](#16-challenges--learnings)
17. [Future Enhancements](#17-future-enhancements)
18. [License](#18-license)

---

## 1. Project Overview

**DeployPilot** is an enterprise-grade, cloud-native SaaS platform built by **CloudForge Technologies** to automate Infrastructure-as-Code (IaC) lifecycle management across multi-cloud environments. It serves as an internal Terraform Cloud alternative — enabling organizations to plan, review, approve, and apply infrastructure changes through a structured, auditable workflow.

The platform is built on a fully asynchronous Python/FastAPI backend with Celery-powered background execution, PostgreSQL 16 as the system of record, and a Kubernetes-native deployment model targeting AWS EKS. At its core, DeployPilot wraps the Terraform binary inside isolated execution environments, orchestrates a 13-state run lifecycle, enforces policy gates, and surfaces all activity through structured audit logs and Prometheus metrics.

| Attribute | Detail |
|-----------|--------|
| Platform Type | Multi-tenant SaaS (IaC Automation) |
| Backend | Python 3.12 + FastAPI (async) |
| IaC Engine | Terraform 1.6.4 |
| Database | PostgreSQL 16 (14 tables, 9 enums, 20+ indexes) |
| Task Queue | Celery 5 + Redis 7 |
| Deployment Target | AWS EKS 1.29 (Kubernetes) |
| Auth Mechanisms | JWT (HS256) + API Key (SHA-256) + RBAC |
| Observability | Prometheus metrics + structlog JSON logging |

---

## 2. Business Problem

Modern engineering organizations manage dozens to hundreds of cloud environments through Terraform. As teams scale, the following critical gaps emerge:

- **No centralized control plane** — engineers run `terraform apply` from local machines with inconsistent credentials and no audit trail
- **Manual approval bottlenecks** — high-risk production changes go through Slack-based reviews with no enforcement mechanism
- **Secret sprawl** — AWS keys and database passwords are scattered across CI/CD variables, local `.tfvars` files, and engineer laptops
- **Zero policy enforcement** — no automated gates for cost thresholds, required approvals, or blocked resource types
- **Fragmented visibility** — leadership cannot see what infrastructure changes are in-flight, who approved them, or what failed
- **Compliance failures** — no immutable audit log of who changed what, when, and why

These gaps create security risk, operational toil, and compliance exposure as organizations scale to hundreds of engineers and dozens of environments.

---

## 3. Objectives

1. **Centralize IaC execution** — eliminate local `terraform` runs; all plans and applies go through the platform
2. **Enforce approval workflows** — no infrastructure change reaches production without structured multi-party approval
3. **Secure secrets at rest and in transit** — Fernet-encrypted secret storage with organizational scope resolution
4. **Automate policy enforcement** — codify organizational rules as database-backed policies with automatic gate evaluation
5. **Provide full audit traceability** — immutable log of every action, who performed it, and what changed
6. **Scale horizontally** — stateless API + ephemeral Celery workers that auto-scale on Kubernetes from 2 to 10 replicas
7. **Integrate with VCS** — GitHub App webhooks trigger runs on PR open/merge with automatic commit status updates
8. **Surface operational metrics** — Prometheus-scraped gauges and counters for platform health and SLA visibility

---

## 4. Key Features

| Feature | Description |
|---------|-------------|
| Multi-tenant hierarchy | Organization → Team → Workspace → Project → Run |
| 13-state run lifecycle | `pending → queued → planning → plan_complete → awaiting_approval → approved → applying → applied` + terminal states |
| Policy engine | 5 policy types: `require_approval`, `cost_threshold`, `resource_block`, `auto_apply`, `merge_guard` |
| Terraform execution | Isolated per-run temp dirs; async subprocess via `asyncio.create_subprocess_exec` |
| Encrypted secrets | Fernet symmetric encryption (key derived from `SECRET_KEY` via SHA-256); scope-resolved (org → workspace → project) |
| GitHub App integration | Webhook HMAC-SHA256 verification; PR status updates; installation token auth |
| RBAC | 5 roles: `super_admin`, `org_owner`, `org_admin`, `member`, `viewer` |
| Dual authentication | JWT (HS256, 60-min access + 30-day refresh) + API keys (`dp_` prefix, SHA-256 hashed) |
| Rate limiting | Redis sliding-window, 100 req/60s per IP, returns HTTP 429 with `Retry-After` header |
| Audit logging | Every state transition, approval, and secret access recorded with actor + timestamp |
| Kubernetes-native | HPA (2–10 worker replicas), PDB (minAvailable: 2), NGINX Ingress with TLS |
| Prometheus metrics | 5 custom metrics: run counts, durations, active runs, pending approvals, policy violations |
| CI/CD pipeline | 6-stage GitHub Actions: lint → security scan → unit tests → integration tests → build → deploy |
| AWS infrastructure | EKS 1.29 + RDS PostgreSQL 16 Multi-AZ + ElastiCache Redis 7.1 + S3 state backend |

---

## 5. System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Client Layer
        UI[Web Dashboard]
        CLI[CLI / SDK]
        GH[GitHub App Webhooks]
    end

    subgraph API Layer - EKS
        NGINX[NGINX Ingress + TLS]
        API1[FastAPI Pod 1]
        API2[FastAPI Pod 2]
        API3[FastAPI Pod 3]
    end

    subgraph Background Processing - EKS
        W1[Celery Worker 1]
        W2[Celery Worker 2]
        WN[Celery Worker N - HPA up to 10]
    end

    subgraph Data Layer - AWS Managed
        PG[(RDS PostgreSQL 16\nMulti-AZ\ndb.r6g.large)]
        RD1[(ElastiCache Redis 7.1\nApp Cache - DB 0)]
        RD2[(ElastiCache Redis 7.1\nCelery Broker - DB 1)]
        RD3[(ElastiCache Redis 7.1\nCelery Results - DB 2)]
    end

    subgraph IaC Execution
        TF[Terraform 1.6.4\nIsolated Temp Dir]
        S3[S3 State Backend\n+ DynamoDB Lock]
    end

    subgraph Observability
        PROM[Prometheus]
        LOGS[CloudWatch Logs\nstructlog JSON]
    end

    UI --> NGINX
    CLI --> NGINX
    GH --> NGINX
    NGINX --> API1 & API2 & API3
    API1 & API2 & API3 --> PG
    API1 & API2 & API3 --> RD1
    API1 & API2 & API3 --> RD2
    W1 & W2 & WN --> RD2
    W1 & W2 & WN --> RD3
    W1 & W2 & WN --> PG
    W1 & W2 & WN --> TF
    TF --> S3
    PROM --> API1 & API2 & API3
    PROM --> W1 & W2 & WN
```

### Run State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> QUEUED : Celery enqueue
    QUEUED --> PLANNING : Worker picks up
    PLANNING --> PLAN_COMPLETE : terraform plan success
    PLANNING --> FAILED : terraform plan error
    PLAN_COMPLETE --> AWAITING_APPROVAL : require_approval policy
    PLAN_COMPLETE --> APPLYING : auto_apply policy
    AWAITING_APPROVAL --> APPROVED : human approval
    AWAITING_APPROVAL --> DISCARDED : human rejection
    APPROVED --> APPLYING : execute_apply task
    APPLYING --> APPLIED : terraform apply success
    APPLYING --> FAILED : terraform apply error
    PLAN_COMPLETE --> DESTROYING : destroy trigger
    APPROVED --> DESTROYING : destroy after approval
    DESTROYING --> DESTROYED : terraform destroy success
    DESTROYING --> FAILED : terraform destroy error
    QUEUED --> CANCELLED : user cancel
    PLANNING --> CANCELLED : user cancel
    PLAN_COMPLETE --> CANCELLED : user cancel
    AWAITING_APPROVAL --> CANCELLED : user cancel
    FAILED --> [*]
    APPLIED --> [*]
    DESTROYED --> [*]
    CANCELLED --> [*]
    DISCARDED --> [*]
```

### Request Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Auth Middleware
    participant JV as JWT Validator
    participant AK as API Key Validator
    participant DB as PostgreSQL
    participant RL as Rate Limiter Redis

    C->>MW: HTTP Request
    MW->>RL: Check sliding window (IP, 100/60s)
    RL-->>MW: OK / 429 Too Many Requests
    MW->>MW: Extract Bearer token or X-API-Key header
    alt JWT path
        MW->>JV: Verify HS256 signature + expiry
        JV->>DB: Load user by sub claim
        DB-->>JV: User record
    else API Key path
        MW->>AK: SHA-256 hash of dp_* key
        AK->>DB: Lookup hashed key + check expiry
        DB-->>AK: User record
    end
    MW->>C: 401 Unauthorized (on failure)
    MW->>Route: Inject current_user dependency
```

---

## 6. Technology Stack

### Backend & Runtime

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Python | 3.12 |
| Web Framework | FastAPI | 0.115.0 |
| ASGI Server | Uvicorn (with standard extras) | 0.31.0 |
| Task Queue | Celery | 5.4.0 |
| Data Validation | Pydantic v2 | 2.9.2 |

### Data Layer

| Component | Technology | Version |
|-----------|-----------|---------|
| Primary Database | PostgreSQL | 16 |
| ORM | SQLAlchemy (async) | 2.0.36 |
| Async DB Driver | asyncpg | 0.30.0 |
| Sync Driver (migrations) | psycopg2-binary | 2.9.x |
| Schema Migrations | Alembic | 1.13.3 |
| Cache / Broker / Results | Redis | 7.1 |

### Security

| Component | Technology | Detail |
|-----------|-----------|--------|
| Password Hashing | bcrypt | 12 rounds |
| JWT | python-jose | HS256, 60-min access / 30-day refresh |
| Encryption at Rest | Fernet (cryptography 43.x) | SHA-256 derived key from SECRET_KEY |
| API Keys | SHA-256 | `dp_` prefix, 32-byte random hex body |
| Webhook Verification | HMAC-SHA256 | GitHub App signature header |

### Infrastructure & Cloud

| Component | Technology | Detail |
|-----------|-----------|--------|
| IaC Engine | Terraform | 1.6.4 (bundled in Docker image) |
| Container Platform | Kubernetes (AWS EKS) | 1.29 |
| Container Build | Docker (multi-stage) | Non-root user 1000 |
| Database | AWS RDS PostgreSQL 16 | Multi-AZ, db.r6g.large |
| Cache | AWS ElastiCache Redis 7.1 | Replication group, 2 nodes |
| Object Storage | AWS S3 | Terraform state backend + KMS encryption |
| State Locking | AWS DynamoDB | Terraform lock table |
| IaC Provisioning | Terraform modules | VPC, EKS, RDS, ElastiCache |

### Observability

| Component | Technology | Detail |
|-----------|-----------|--------|
| Metrics | Prometheus client | 5 custom metrics, `/metrics` endpoint |
| Structured Logging | structlog | JSON output, log-level filtering |
| Log Aggregation | AWS CloudWatch | EKS container logs via Fluent Bit |

### Developer Tooling

| Tool | Purpose |
|------|---------|
| ruff | Linting (fast, replaces flake8) |
| black | Code formatting |
| isort | Import ordering |
| bandit | Static security analysis |
| safety | Dependency vulnerability scan |
| pytest + pytest-asyncio | Async test suite |
| pytest-cov | Coverage reporting (80% threshold) |
| GitHub Actions | CI/CD automation |

---

## 7. Project Structure

```
Project 10/
├── deploypilot/                    # Main application package
│   ├── api/
│   │   └── v1/
│   │       ├── routes/             # FastAPI route handlers
│   │       │   ├── auth.py         # /auth/* — login, refresh, register
│   │       │   ├── organizations.py
│   │       │   ├── workspaces.py
│   │       │   ├── projects.py
│   │       │   ├── runs.py
│   │       │   ├── secrets.py
│   │       │   ├── policies.py
│   │       │   ├── integrations.py
│   │       │   └── health.py
│   │       └── schemas/            # Pydantic v2 request/response models
│   ├── common/
│   │   ├── dependencies/           # FastAPI Depends() factories
│   │   ├── exceptions/             # HTTPException wrappers (4xx/5xx)
│   │   └── middleware/
│   │       └── rate_limit.py       # Redis sliding-window rate limiter
│   ├── core/
│   │   ├── config.py               # Settings from environment variables
│   │   ├── database.py             # AsyncSession factory + managed_session
│   │   ├── logging.py              # structlog configuration
│   │   └── security.py             # bcrypt, JWT, API keys, HMAC
│   ├── db/
│   │   └── migrations/
│   │       └── 001_initial_schema.py  # Idempotent SQL: 9 enums, 14 tables, 20+ indexes
│   ├── models/                     # SQLAlchemy 2.x ORM models
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── workspace.py
│   │   ├── project.py
│   │   ├── run.py
│   │   ├── policy.py
│   │   ├── approval.py
│   │   ├── audit.py
│   │   ├── notification.py
│   │   ├── integration.py
│   │   └── secret.py
│   ├── modules/                    # Business logic services
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── workspaces/
│   │   ├── projects/
│   │   ├── runs/
│   │   │   ├── service.py          # Run lifecycle state machine
│   │   │   └── engine.py           # TerraformEngine (async subprocess)
│   │   ├── secrets/
│   │   ├── policies/
│   │   └── integrations/
│   │       └── github_client.py    # GitHub App: tokens, webhooks, PR status
│   ├── monitoring/
│   │   └── metrics.py              # 5 Prometheus counters/gauges/histograms
│   └── workers/
│       ├── celery_app.py           # Celery app + conf.include task discovery
│       └── tasks/
│           ├── run_tasks.py        # execute_plan, execute_apply
│           ├── notification_tasks.py
│           └── cleanup_tasks.py
├── k8s/
│   └── base/
│       ├── api-deployment.yaml     # 3 replicas, RollingUpdate, IRSA, resource limits
│       ├── worker-deployment.yaml  # HPA 2-10 replicas, 70% CPU trigger
│       ├── pdb.yaml                # PodDisruptionBudget minAvailable: 2
│       ├── ingress.yaml            # NGINX Ingress + TLS + rate limit annotations
│       └── configmap.yaml
├── terraform/
│   └── environments/
│       └── production/
│           └── main.tf             # VPC, EKS, RDS, ElastiCache, S3, DynamoDB
├── .github/
│   └── workflows/
│       └── ci.yml                  # 6-stage GitHub Actions pipeline
├── docker-compose.yml              # Local dev: postgres, redis, api, worker
├── Dockerfile                      # Multi-stage build with Terraform 1.6.4
├── requirements.txt                # Pinned production dependencies
├── alembic.ini
└── README.md
```

---

## 8. Database Design

### Schema Overview

PostgreSQL 16 with **14 tables**, **9 custom enum types**, and **20+ performance indexes**. All primary keys are UUIDs generated by `gen_random_uuid()`. All timestamps are `TIMESTAMP WITH TIME ZONE`.

### Custom Enum Types

| Enum | Values |
|------|--------|
| `user_role` | `super_admin`, `org_owner`, `org_admin`, `member`, `viewer` |
| `run_status` | `pending`, `queued`, `planning`, `plan_complete`, `awaiting_approval`, `approved`, `applying`, `applied`, `destroying`, `destroyed`, `failed`, `cancelled`, `discarded` |
| `run_trigger` | `manual`, `webhook`, `schedule`, `api` |
| `policy_type` | `require_approval`, `cost_threshold`, `resource_block`, `auto_apply`, `merge_guard` |
| `policy_effect` | `allow`, `deny` |
| `secret_scope` | `organization`, `workspace`, `project` |
| `integration_type` | `github`, `gitlab`, `bitbucket`, `slack` |
| `approval_status` | `pending`, `approved`, `rejected`, `expired` |
| `notification_type` | `run_started`, `run_complete`, `approval_required`, `policy_violation` |

### Entity Relationship Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        varchar email UK
        varchar full_name
        varchar hashed_password
        user_role role
        bool is_active
        timestamptz created_at
        timestamptz deleted_at
    }

    api_keys {
        uuid id PK
        uuid user_id FK
        varchar name
        varchar key_prefix
        varchar hashed_key
        timestamptz expires_at
        timestamptz last_used_at
    }

    organizations {
        uuid id PK
        varchar name
        varchar slug UK
        uuid owner_id FK
        jsonb settings
        timestamptz deleted_at
    }

    teams {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar slug
    }

    team_memberships {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        user_role role
    }

    workspaces {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar slug
        text description
        timestamptz deleted_at
    }

    projects {
        uuid id PK
        uuid workspace_id FK
        varchar name
        varchar slug
        varchar repo_url
        varchar repo_branch
        varchar vcs_provider
        varchar terraform_version
        bool is_active
        timestamptz deleted_at
    }

    infrastructure_runs {
        uuid id PK
        uuid project_id FK
        uuid triggered_by_id FK
        run_status status
        run_trigger trigger
        varchar commit_sha
        varchar branch
        int pr_number
        int resources_added
        int resources_changed
        int resources_destroyed
        text plan_output
        text apply_output
        text error_message
        timestamptz completed_at
    }

    policies {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        varchar name
        policy_type type
        policy_effect effect
        jsonb config
        bool is_enabled
    }

    approval_requests {
        uuid id PK
        uuid run_id FK
        uuid requested_by FK
        uuid resolved_by FK
        approval_status status
        text comment
        timestamptz expires_at
    }

    audit_logs {
        uuid id PK
        uuid organization_id FK
        uuid actor_id FK
        varchar action
        varchar resource_type
        uuid resource_id
        jsonb before_state
        jsonb after_state
        varchar ip_address
    }

    secrets {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        uuid project_id FK
        varchar key
        text encrypted_value
        secret_scope scope
    }

    integrations {
        uuid id PK
        uuid organization_id FK
        integration_type type
        varchar name
        jsonb config
        bool is_active
    }

    notifications {
        uuid id PK
        uuid user_id FK
        uuid run_id FK
        notification_type type
        text message
        bool is_read
    }

    users ||--o{ api_keys : "has"
    users ||--o{ team_memberships : "belongs to"
    organizations ||--o{ teams : "contains"
    organizations ||--o{ workspaces : "owns"
    organizations ||--o{ policies : "defines"
    organizations ||--o{ secrets : "stores"
    organizations ||--o{ integrations : "configures"
    organizations ||--o{ audit_logs : "records"
    teams ||--o{ team_memberships : "has"
    workspaces ||--o{ projects : "contains"
    workspaces ||--o{ policies : "scoped to"
    workspaces ||--o{ secrets : "scoped to"
    projects ||--o{ infrastructure_runs : "has"
    projects ||--o{ secrets : "scoped to"
    infrastructure_runs ||--o{ approval_requests : "requires"
    infrastructure_runs ||--o{ notifications : "triggers"
```

---

## 9. API Documentation

### Base URL

```
https://api.deploypilot.io/api/v1
```

### Authentication

All endpoints require one of:
- `Authorization: Bearer <jwt_access_token>`
- `X-API-Key: dp_<api_key_value>`

### Core Endpoints

#### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/auth/register` | Create a new user account | No |
| `POST` | `/auth/login` | Exchange credentials for JWT tokens | No |
| `POST` | `/auth/refresh` | Refresh access token using refresh token | No |
| `POST` | `/auth/api-keys` | Create a new API key for the current user | Yes |
| `GET` | `/auth/api-keys` | List all API keys for the current user | Yes |
| `DELETE` | `/auth/api-keys/{key_id}` | Revoke an API key | Yes |

#### Organizations

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|---------|
| `POST` | `/organizations` | Create a new organization | Authenticated |
| `GET` | `/organizations` | List organizations for current user | member |
| `GET` | `/organizations/{org_id}` | Get organization details | member |
| `PATCH` | `/organizations/{org_id}` | Update organization settings | org_admin |
| `DELETE` | `/organizations/{org_id}` | Soft-delete organization | org_owner |

#### Workspaces

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|---------|
| `POST` | `/organizations/{org_id}/workspaces` | Create workspace | org_admin |
| `GET` | `/organizations/{org_id}/workspaces` | List workspaces | member |
| `GET` | `/workspaces/{ws_id}` | Get workspace details | member |
| `DELETE` | `/workspaces/{ws_id}` | Soft-delete workspace | org_admin |

#### Projects

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|---------|
| `POST` | `/workspaces/{ws_id}/projects` | Create project (linked to VCS repo) | org_admin |
| `GET` | `/workspaces/{ws_id}/projects` | List projects in workspace | member |
| `GET` | `/workspaces/{ws_id}/projects/{project_id}` | Get project details | member |
| `DELETE` | `/workspaces/{ws_id}/projects/{project_id}` | Delete project | org_admin |

#### Infrastructure Runs

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|---------|
| `POST` | `/projects/{project_id}/runs` | Trigger a new Terraform run | member |
| `GET` | `/projects/{project_id}/runs` | List runs for a project | member |
| `GET` | `/runs/{run_id}` | Get run details + plan output | member |
| `POST` | `/runs/{run_id}/approve` | Approve a run awaiting approval | org_admin |
| `POST` | `/runs/{run_id}/reject` | Reject an awaiting run | org_admin |
| `POST` | `/runs/{run_id}/cancel` | Cancel a queued/planning run | member |

#### Secrets

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|---------|
| `POST` | `/secrets` | Create an encrypted secret (org/workspace/project scope) | org_admin |
| `GET` | `/secrets` | List secrets (values redacted) | org_admin |
| `DELETE` | `/secrets/{secret_id}` | Delete a secret | org_admin |

#### Policies

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|---------|
| `POST` | `/organizations/{org_id}/policies` | Create enforcement policy | org_admin |
| `GET` | `/organizations/{org_id}/policies` | List policies | member |
| `PATCH` | `/policies/{policy_id}` | Update policy config | org_admin |
| `DELETE` | `/policies/{policy_id}` | Delete policy | org_owner |

#### Platform

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness check (returns `{"status": "ok"}`) |
| `GET` | `/health/ready` | Readiness check (DB + Redis connectivity) |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint |

### Example: Trigger an Infrastructure Run

```bash
curl -X POST https://api.deploypilot.io/api/v1/projects/{project_id}/runs \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "commit_sha": "abc1234",
    "branch": "main"
  }'
```

**Response:**
```json
{
  "id": "018e4a1b-2c3d-4e5f-6789-abcdef012345",
  "project_id": "018e4a1b-0000-0000-0000-000000000001",
  "status": "queued",
  "trigger": "manual",
  "commit_sha": "abc1234",
  "branch": "main",
  "resources_added": 0,
  "resources_changed": 0,
  "resources_destroyed": 0,
  "plan_output": null,
  "error_message": null,
  "created_at": "2025-01-15T10:30:00Z",
  "completed_at": null
}
```

---

## 10. Security Implementation

### Authentication Layers

#### JWT (JSON Web Tokens)

- Algorithm: **HS256** with `SECRET_KEY` from environment
- Access token expiry: **60 minutes** (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60`)
- Refresh token expiry: **30 days** (`JWT_REFRESH_TOKEN_EXPIRE_DAYS=30`)
- Claims: `sub` (user UUID), `exp`, `iat`, `type` (`access` | `refresh`)

#### API Keys

- Format: `dp_<32-byte-random-hex>` (prefix `dp_` + 64 hex chars)
- Storage: SHA-256 hash stored in database, plaintext never persisted
- Expiry: Optional per-key expiry timestamp
- Last-used tracking: Updated on each successful authentication

#### Password Hashing

```python
# bcrypt with 12 rounds — deliberately slow to resist brute force
bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

### Encryption at Rest

Secrets (Terraform variables, cloud credentials) are encrypted using **Fernet symmetric encryption**:

```
Fernet key = base64url(SHA-256(SECRET_KEY))
encrypted_value = Fernet(key).encrypt(plaintext.encode())
```

The Fernet key is derived at runtime from `SECRET_KEY` — never stored separately. Rotating `SECRET_KEY` invalidates all secrets (deliberate trade-off for operational simplicity).

### Scope-Resolved Secret Injection

When executing a Terraform run, secrets are resolved from three scopes in priority order:

```
project secrets  (highest priority — override workspace and org)
    ↑
workspace secrets
    ↑
organization secrets  (lowest priority — global defaults)
```

All resolved secrets are injected as environment variables into the Terraform subprocess, never written to disk.

### GitHub Webhook Verification

```python
# HMAC-SHA256 with constant-time comparison to prevent timing attacks
signature = "sha256=" + hmac.new(
    secret.encode(), payload, hashlib.sha256
).hexdigest()
hmac.compare_digest(signature, request_signature)
```

### Rate Limiting

Redis sorted-set sliding window per IP address:

- Window: **60 seconds**
- Limit: **100 requests**
- Response on exceed: `HTTP 429` with `Retry-After` header
- Keys expire automatically after window passes

### RBAC Authorization Matrix

| Resource | viewer | member | org_admin | org_owner | super_admin |
|----------|--------|--------|-----------|-----------|-------------|
| View runs | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trigger run | ✗ | ✓ | ✓ | ✓ | ✓ |
| Approve run | ✗ | ✗ | ✓ | ✓ | ✓ |
| Manage secrets | ✗ | ✗ | ✓ | ✓ | ✓ |
| Manage policies | ✗ | ✗ | ✓ | ✓ | ✓ |
| Delete organization | ✗ | ✗ | ✗ | ✓ | ✓ |
| Cross-org admin | ✗ | ✗ | ✗ | ✗ | ✓ |

### Kubernetes Security Controls

- **Read-only root filesystem** on all containers (`readOnlyRootFilesystem: true`)
- **Non-root user** UID 1000 (`runAsNonRoot: true`, `runAsUser: 1000`)
- **IRSA (IAM Roles for Service Accounts)** — pods get AWS credentials via projected token, not environment variables
- **PodDisruptionBudget** — minimum 2 API pods always available during node maintenance
- **TLS termination** at NGINX Ingress with certificate managed by cert-manager

---

## 11. CI/CD Pipeline

### Pipeline Overview

```mermaid
flowchart LR
    subgraph Trigger
        PR[Pull Request / Push to main]
    end

    subgraph Stage 1 - Lint
        L1[ruff check]
        L2[black --check]
        L3[isort --check]
    end

    subgraph Stage 2 - Security
        S1[bandit -r deploypilot/]
        S2[safety check]
    end

    subgraph Stage 3 - Unit Tests
        U1[pytest tests/unit/\n--cov=deploypilot\n--cov-fail-under=80]
    end

    subgraph Stage 4 - Integration Tests
        I1[Spin up postgres:16\n+ redis:7 services]
        I2[Run Alembic migrations]
        I3[pytest tests/integration/]
    end

    subgraph Stage 5 - Build
        B1[Docker multi-stage build]
        B2[Push to ghcr.io/\ncloudforge/deploypilot:sha]
    end

    subgraph Stage 6 - Deploy
        D1[aws eks update-kubeconfig]
        D2[kubectl kustomize k8s/base/]
        D3[kubectl apply --server-side]
        D4[kubectl rollout status]
    end

    PR --> L1 & L2 & L3
    L1 & L2 & L3 --> S1 & S2
    S1 & S2 --> U1
    U1 --> I1
    I1 --> I2
    I2 --> I3
    I3 --> B1
    B1 --> B2
    B2 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> D4
```

### Stage Details

| Stage | Tool | Gate Criteria | Runs On |
|-------|------|--------------|---------|
| Lint | ruff, black, isort | Zero lint errors | Every push |
| Security | bandit (severity: HIGH), safety | No high-severity issues | Every push |
| Unit Tests | pytest + pytest-cov | >= 80% coverage | Every push |
| Integration Tests | pytest + real PostgreSQL 16 + Redis 7 | All tests pass | Every push |
| Build | Docker BuildKit multi-stage | Image builds clean | Push to `main` only |
| Deploy | kubectl + kustomize | Rollout completes healthy | Push to `main` only |

### Artifact Flow

```
ghcr.io/cloudforge/deploypilot:<git-sha>   ← built in Stage 5
                    ↓
         EKS Deployment (Stage 6)
         RollingUpdate: maxUnavailable=0
         (zero-downtime deploys)
```

---

## 12. Deployment Architecture

### AWS Infrastructure

```mermaid
graph TB
    subgraph AWS Region us-east-1
        subgraph VPC - 10.0.0.0/16
            subgraph Public Subnets - 3 AZs
                ALB[Application Load Balancer]
                NAT[NAT Gateways x3]
            end

            subgraph Private Subnets - 3 AZs
                subgraph EKS Cluster - 1.29
                    subgraph System Node Group - m6i.large 2-4 nodes
                        CPODS[CoreDNS + kube-proxy\nAWS Load Balancer Controller\nNGINX Ingress\nCluster Autoscaler]
                    end
                    subgraph Worker Node Group - c6i.xlarge 2-10 nodes
                        APODS[API Pods x3\nFastAPI + Uvicorn]
                        WPODS[Celery Worker Pods\nHPA 2-10]
                    end
                end
            end

            subgraph Data Subnets - 3 AZs
                RDS[(RDS PostgreSQL 16\nMulti-AZ\nPrimary + Standby\ndb.r6g.large\n100GB gp3)]
                EC[(ElastiCache Redis 7.1\nReplication Group\n2 nodes\ncache.r7g.large)]
            end
        end

        subgraph Global Services
            S3[(S3 Bucket\nTerraform State\nKMS encrypted)]
            DDB[(DynamoDB\nState Lock Table)]
            ECR[(GHCR / ECR\nContainer Registry)]
            IAM[IRSA\nIAM Roles for\nService Accounts]
        end
    end

    ALB --> APODS
    APODS --> RDS
    APODS --> EC
    WPODS --> RDS
    WPODS --> EC
    WPODS --> S3
    WPODS --> DDB
    IAM --> APODS
    IAM --> WPODS
```

### Kubernetes Resource Specifications

#### API Deployment

```yaml
replicas: 3
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0      # Zero-downtime deploys
    maxSurge: 1
resources:
  requests: { cpu: 250m, memory: 256Mi }
  limits:   { cpu: 1000m, memory: 1Gi }
```

#### Worker Horizontal Pod Autoscaler

```yaml
minReplicas: 2
maxReplicas: 10
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70
```

#### Pod Disruption Budget

```yaml
minAvailable: 2   # At least 2 API pods must be healthy during node drain
```

### Terraform State Backend

```hcl
backend "s3" {
  bucket         = "deploypilot-terraform-state-prod"
  key            = "production/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "deploypilot-state-lock"
}
```

---

## 13. Monitoring & Logging

### Prometheus Metrics

All 5 custom metrics are exposed at `/metrics` and scraped via pod annotations:

| Metric Name | Type | Labels | Description |
|------------|------|--------|-------------|
| `deploypilot_runs_total` | Counter | `status`, `trigger` | Total infrastructure runs by terminal status and trigger type |
| `deploypilot_run_duration_seconds` | Histogram | `trigger` | End-to-end run duration from queue to completion |
| `deploypilot_active_runs` | Gauge | — | Currently executing runs (planning or applying) |
| `deploypilot_approvals_pending` | Gauge | — | Runs blocked in `awaiting_approval` state |
| `deploypilot_policy_violations_total` | Counter | `policy_type` | Policy evaluation failures by policy type |

### Prometheus Scrape Configuration

```yaml
# Pod annotations in api-deployment.yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8000"
  prometheus.io/path: "/metrics"
```

### Structured Logging

All log output uses **structlog** in JSON format — every log entry carries consistent fields:

```json
{
  "event": "terraform_plan_ok",
  "run_id": "018e4a1b-2c3d-4e5f-6789-abcdef012345",
  "summary": { "added": 3, "changed": 1, "destroyed": 0 },
  "logger": "deploypilot.modules.runs.engine",
  "level": "info",
  "timestamp": "2025-01-15T10:30:45.123456Z"
}
```

### Key Log Events

| Event | Context |
|-------|---------|
| `terraform_init_ok` | `run_id` |
| `terraform_plan_ok` | `run_id`, `summary` (added/changed/destroyed) |
| `terraform_apply_ok` | `run_id` |
| `terraform_destroy_ok` | `run_id` |
| `rate_limit_exceeded` | `client_ip` |
| `auth_failure` | `reason` |
| `policy_violation` | `policy_id`, `policy_type`, `run_id` |
| `approval_requested` | `run_id`, `requested_by` |

### Alerting Recommendations

| Alert | Condition | Severity |
|-------|-----------|---------|
| High failure rate | `rate(deploypilot_runs_total{status="failed"}[5m]) > 0.1` | Critical |
| Approval backlog | `deploypilot_approvals_pending > 10` | Warning |
| Worker saturation | `deploypilot_active_runs / deploypilot_worker_count > 0.8` | Warning |
| Slow runs | `histogram_quantile(0.95, deploypilot_run_duration_seconds) > 600` | Warning |

---

## 14. Installation & Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.12+ |
| Docker + Docker Compose | Latest |
| PostgreSQL | 16 (via Docker) |
| Redis | 7.1 (via Docker) |
| Terraform | 1.6.4 (optional for local testing) |

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/Skillfyme-R/DevOps-Capstone-Projects.git
cd "DevOps-Capstone-Projects/Project 10"
```

#### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your local values:

```env
# Application
SECRET_KEY=your-32-byte-secret-key-change-in-production
DEBUG=true
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql+asyncpg://deploypilot:deploypilot@localhost:5432/deploypilot
SYNC_DATABASE_URL=postgresql+psycopg2://deploypilot:deploypilot@localhost:5432/deploypilot

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# JWT
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Terraform
TERRAFORM_BINARY_PATH=/usr/local/bin/terraform
TERRAFORM_WORKING_DIR=/tmp/deploypilot/runs

# Monitoring
PROMETHEUS_ENABLED=true

# GitHub App (optional for local dev)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
```

#### 3. Start with Docker Compose

```bash
docker-compose up -d
```

This starts:
- `postgres` — PostgreSQL 16 on port 5432
- `redis` — Redis 7 on port 6379
- `api` — FastAPI on port 8000
- `worker` — Celery worker

#### 4. Run Database Migrations

```bash
docker-compose exec api python -m alembic upgrade head
```

#### 5. Verify the Setup

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "SecurePass123!", "full_name": "Admin User"}'

# Login and get JWT
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "SecurePass123!"}'

# Prometheus metrics
curl http://localhost:8000/metrics
```

#### 6. Interactive API Documentation

Navigate to `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc` (ReDoc).

### Production Deployment (AWS EKS)

```bash
# 1. Provision AWS infrastructure
cd terraform/environments/production
terraform init
terraform plan
terraform apply

# 2. Configure kubectl
aws eks update-kubeconfig --name deploypilot-prod --region us-east-1

# 3. Create Kubernetes secrets
kubectl create secret generic deploypilot-secrets \
  --from-literal=SECRET_KEY="$SECRET_KEY" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=REDIS_URL="$REDIS_URL"

# 4. Deploy application
kubectl apply -k k8s/base/
kubectl rollout status deployment/deploypilot-api
```

---

## 15. Screenshots & Demo

> **Note:** This section shows the platform's key operational views.

### Platform Dashboard

```
+--------------------------------------------------------------+
|  DeployPilot                    CloudForge Technologies       |
+--------------------------------------------------------------+
|                                                              |
|  Active Runs          Pending Approvals    Policy Violations |
|  ########  12         ####  4              ##  2             |
|                                                              |
|  Recent Runs                                                 |
|  +--------------------------------------------------------+  |
|  | Run ID      Project       Status         Duration      |  |
|  | 018e4a1b   prod-vpc      applied         4m 23s        |  |
|  | 018e4a1c   staging-rds   awaiting        2m 10s        |  |
|  | 018e4a1d   dev-eks       failed          1m 05s        |  |
|  +--------------------------------------------------------+  |
+--------------------------------------------------------------+
```

### Terraform Plan Output View

```
+--------------------------------------------------------------+
|  Run #018e4a1b -- prod-vpc -- PLAN COMPLETE                  |
+--------------------------------------------------------------+
|  Plan: 3 to add, 1 to change, 0 to destroy                   |
|                                                              |
|  + aws_vpc.main                                              |
|  + aws_subnet.private[0]                                     |
|  + aws_subnet.private[1]                                     |
|  ~ aws_security_group.api (ingress rule update)              |
|                                                              |
|  +-------------------------------------+                     |
|  |  [Approve]    [Reject]   [Cancel]   |  requires           |
|  +-------------------------------------+  org_admin role     |
+--------------------------------------------------------------+
```

### Prometheus Metrics (Grafana)

```
deploypilot_runs_total{status="applied"}     ############ 847
deploypilot_runs_total{status="failed"}      ## 23
deploypilot_active_runs                      #### 12
deploypilot_approvals_pending                ## 4
deploypilot_policy_violations_total          # 2

run_duration_seconds p50: 3m 12s
run_duration_seconds p95: 8m 44s
run_duration_seconds p99: 14m 02s
```

---

## 16. Challenges & Learnings

### Challenge 1: SQLAlchemy Async + Celery Sync Boundary

**Problem:** Celery workers run in a synchronous context, but the entire application stack uses `asyncio`-native SQLAlchemy sessions and business logic.

**Solution:** Each Celery task wraps its async logic in a dedicated `asyncio.run()` call via `_run_async()`. This creates a fresh event loop per task execution, avoiding the pitfall of sharing an event loop across forked worker processes. The `asyncpg` driver works cleanly in this model because each `managed_session()` context manager creates a new connection.

**Learning:** Never use `asyncio.get_event_loop().run_until_complete()` in forked processes — the parent's loop is inherited but in an invalid state. `asyncio.run()` always creates a fresh loop.

### Challenge 2: SQLAlchemy Enum Serialization (`values_callable`)

**Problem:** PostgreSQL enum columns serialized as Python enum member *names* (e.g., `"PLAN_COMPLETE"`) instead of their *values* (e.g., `"plan_complete"`), causing `DataError` exceptions on insert.

**Solution:** Every `SAEnum` column requires `values_callable=lambda x: [e.value for e in x]`:

```python
status: Mapped[RunStatus] = mapped_column(
    SAEnum(RunStatus, values_callable=lambda x: [e.value for e in x])
)
```

**Learning:** SQLAlchemy's `Enum` type defaults to using `__members__` (Python name) not `.value`. The `values_callable` parameter overrides this globally for the column.

### Challenge 3: FastAPI Dependency Ordering

**Problem:** FastAPI raises `AssertionError: Cannot specify Depends in Annotated and default value together` when mixing `Annotated` dependencies with explicit defaults.

**Solution:** The `CurrentUser = Annotated[User, Depends(get_current_user)]` pattern must appear *before* any `db: AsyncSession = Depends(get_db)` parameter in route signatures — Python requires parameters with defaults to follow parameters without defaults.

**Learning:** In FastAPI, `Depends()` embedded in `Annotated` is not a "default" in the Python sense — it's resolved by FastAPI's DI system. But Python's parameter ordering rules still apply to the `def` signature.

### Challenge 4: Celery Task Discovery in Package Submodules

**Problem:** `autodiscover_tasks(["deploypilot.workers.tasks"])` did not discover tasks in `deploypilot/workers/tasks/run_tasks.py` because the submodule structure wasn't correctly resolved.

**Solution:** Replaced `autodiscover_tasks` with explicit `conf.include`:

```python
celery_app.conf.include = [
    "deploypilot.workers.tasks.run_tasks",
    "deploypilot.workers.tasks.notification_tasks",
    "deploypilot.workers.tasks.cleanup_tasks",
]
```

**Learning:** `autodiscover_tasks` works well for flat module layouts but requires precise package naming for nested structures. Explicit `conf.include` is more reliable and self-documenting.

### Challenge 5: Alembic Sync vs. Async Migration Strategy

**Problem:** Alembic's migration engine is fundamentally synchronous — it cannot use `asyncpg` (async-only driver) for its internal connection management.

**Solution:** Two separate database URL configurations:
- `DATABASE_URL` uses `postgresql+asyncpg://` for the FastAPI application
- `SYNC_DATABASE_URL` uses `postgresql+psycopg2://` for Alembic migrations only

Migrations use raw idempotent PL/pgSQL `DO $$ BEGIN ... END $$;` blocks to safely re-run on existing databases without error.

**Learning:** Always design your migration strategy before committing to an async-only database driver. Having two URLs is verbose but clean and avoids unmaintainable monkey-patching.

### Challenge 6: Terraform Temp Directory Race Conditions

**Problem:** `tempfile.mkdtemp()` failed with `FileNotFoundError` because the parent directory (`/tmp/deploypilot/runs`) did not exist on container startup.

**Solution:** Added `os.makedirs(settings.TERRAFORM_WORKING_DIR, exist_ok=True)` in `TerraformEngine.__init__()` before calling `mkdtemp`. The `exist_ok=True` flag makes this idempotent and safe across concurrent workers.

**Learning:** Never assume filesystem state on container startup. Explicitly create required directories in application initialization code, not in Dockerfiles (which may not persist in ephemeral pods).

---

## 17. Future Enhancements

| Priority | Feature | Description |
|----------|---------|-------------|
| High | Terraform state visualization | Parse and display resource graph from `terraform show -json` output in the dashboard |
| High | Cost estimation | Integrate Infracost API to show estimated monthly cost delta in plan output before approval |
| High | SSO/SAML integration | Support Okta, Google Workspace, and Azure AD as identity providers |
| Medium | Multi-cloud support | Add OpenTofu (open-source Terraform fork) and Pulumi as alternative IaC engines |
| Medium | Drift detection | Scheduled runs to detect configuration drift between actual cloud state and IaC definition |
| Medium | Workspace templates | Clone workspace configurations including variables, policies, and team access |
| Medium | Mobile notifications | Push notifications via Firebase for approval requests and run failures |
| Medium | Slack bot | Approve/reject runs and view run status directly from Slack |
| Low | Terraform module registry | Private module registry with versioning for reusable infrastructure modules |
| Low | Custom webhook events | Configurable outbound webhooks on run state transitions for external integrations |
| Low | Run history analytics | Trend analysis on infrastructure change frequency, failure rates, and approval latency |
| Low | Multi-region deployment | Active-active EKS across two AWS regions with Route53 failover |

---

## 18. License

© Learnsyte Learning Private Limited **(Skillfyme)**
