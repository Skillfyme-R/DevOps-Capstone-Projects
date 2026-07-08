# DeployPilot

**Cloud Infrastructure Automation Platform**  
Built by CloudForge Technologies

DeployPilot is a production-ready SaaS platform that gives engineering teams
full control over their Terraform infrastructure workflows. Pull request
integration, policy-gated approvals, multi-tenant workspaces, and end-to-end
observability — all in one platform.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Folder Structure](#folder-structure)
4. [Core Features](#core-features)
5. [Quick Start (Local Development)](#quick-start-local-development)
6. [Configuration](#configuration)
7. [API Reference](#api-reference)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Infrastructure Provisioning](#infrastructure-provisioning)
10. [Deployment](#deployment)
11. [Observability](#observability)
12. [Security](#security)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)
15. [Roadmap](#roadmap)

---

## Overview

DeployPilot connects your GitHub repositories to a managed Terraform execution
engine. When a pull request is opened, DeployPilot runs `terraform plan`,
posts a rich diff comment, evaluates configured policies, and optionally
requires an approved review before allowing `terraform apply` to proceed.

**Technology Stack**

| Layer | Technology |
|---|---|
| API | Python 3.12 + FastAPI |
| Database | PostgreSQL 16 (async via SQLAlchemy + asyncpg) |
| Cache / Queue broker | Redis 7 |
| Background workers | Celery 5 |
| Infrastructure tool | Terraform 1.6+ |
| Container runtime | Docker / Kubernetes |
| Cloud provider | AWS (EKS, RDS, ElastiCache, S3, IAM) |
| IaC | Terraform (for DeployPilot's own infrastructure) |
| CI/CD | GitHub Actions |
| Observability | Prometheus + Grafana + Structlog |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
              ┌────────▼─────────┐
              │   AWS ALB / Nginx │  (TLS termination, rate limiting)
              └────────┬─────────┘
                       │
         ┌─────────────▼──────────────┐
         │     DeployPilot API        │  FastAPI, 3+ replicas
         │  (deploypilot.main:app)    │
         └──────┬──────────┬──────────┘
                │          │
     ┌──────────▼──┐  ┌────▼────────────┐
     │ PostgreSQL  │  │   Redis Cache   │
     │  (RDS PG16) │  │  (ElastiCache)  │
     └─────────────┘  └────┬────────────┘
                           │ Celery broker
                  ┌────────▼────────────┐
                  │   Celery Workers    │  Terraform executor
                  │  (2–10 replicas)    │
                  └────────┬────────────┘
                           │
                  ┌────────▼────────────┐
                  │  Terraform Binary   │  sandboxed per-run workdir
                  │  + AWS credentials  │
                  └─────────────────────┘

External integrations:
  GitHub App  ──→  /api/v1/webhooks/github
  Slack       ──→  Outbound webhook notifications
  Prometheus  ──→  /metrics scrape endpoint
  Grafana     ──→  Dashboard queries Prometheus
```

### Data Flow: PR → Plan → Approve → Apply

```
  Developer opens PR
       │
       ▼
  GitHub fires pull_request webhook
       │
       ▼
  DeployPilot webhook handler
  finds matching Projects → creates InfrastructureRun
       │
       ▼
  Celery: execute_plan task
  ├── terraform init
  ├── terraform plan -out=tfplan
  └── stores plan output in Run record
       │
       ▼
  PolicyService evaluates workspace policies
  ├── REQUIRE_APPROVAL → transition to AWAITING_APPROVAL
  └── AUTO_APPLY      → transition to APPROVED
       │
       ▼
  GitHubAppClient posts plan diff comment to PR
       │
       ▼
  [If approval required]
  Reviewer calls POST /runs/{id}/approve
       │
       ▼
  Celery: execute_apply task
  ├── terraform apply tfplan
  └── stores apply output in Run record → status=APPLIED
       │
       ▼
  NotificationDispatcher fires run.applied event
  └── Slack / Email / in-app
```

---

## Folder Structure

```
Project 10/
├── deploypilot/               # Application source code
│   ├── main.py                # FastAPI app entry point
│   ├── core/                  # Config, DB, Redis, Security, Logging
│   ├── models/                # SQLAlchemy ORM models
│   ├── api/v1/
│   │   ├── routes/            # Route handlers (auth, orgs, workspaces, runs…)
│   │   └── schemas/           # Pydantic request/response schemas
│   ├── modules/               # Domain logic (service layer)
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── workspaces/
│   │   ├── projects/
│   │   ├── runs/              # TerraformEngine + RunService
│   │   ├── policies/
│   │   ├── approvals/
│   │   ├── audit/
│   │   ├── notifications/
│   │   ├── secrets/
│   │   └── integrations/      # GitHub App client + webhook handler
│   ├── workers/               # Celery app + task modules
│   ├── db/                    # Alembic env + migrations
│   ├── common/                # Shared middleware, exceptions, utils
│   └── monitoring/            # Health probes + Prometheus metrics
├── terraform/
│   ├── modules/               # Reusable modules: networking, database, IAM…
│   └── environments/          # staging, production root modules
├── k8s/
│   ├── base/                  # Kustomize base manifests
│   └── overlays/              # Per-environment patches
├── docker/
│   ├── api/Dockerfile
│   ├── worker/Dockerfile
│   └── nginx/nginx.conf
├── docker-compose.yml         # Full local stack
├── .github/workflows/         # CI + Terraform plan workflows
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── operations/
│   └── runbooks/
├── scripts/dev-setup.sh
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
└── .env.example
```

---

## Core Features

| Feature | Description |
|---|---|
| **Multi-tenant SaaS** | Organizations → Teams → Workspaces → Projects hierarchy |
| **GitHub Integration** | GitHub App for webhook ingestion and PR comments |
| **Terraform Engine** | Async plan/apply via Celery workers, sandboxed per-run |
| **Policy Engine** | Require-approval, resource-block, merge-guard, auto-apply policies |
| **RBAC** | super_admin / org_owner / org_admin / member / viewer roles |
| **Approval Workflows** | Gate apply behind configurable review requirements |
| **Secret Management** | Fernet-encrypted at rest; injected as env vars into runs |
| **Audit Logging** | Immutable append-only audit trail for every platform action |
| **Notifications** | In-app, Slack webhook, and SMTP email channels |
| **Observability** | Prometheus metrics, structured JSON logging, health probes |
| **API Keys** | SHA-256 hashed, scoped, expirable machine tokens |
| **Rate Limiting** | Sliding-window per-IP limiter backed by Redis |

---

## Quick Start (Local Development)

**Prerequisites:** Docker Desktop, Python 3.12, Git

```bash
# 1. Clone & enter
git clone https://github.com/cloudforge/deploypilot.git
cd deploypilot

# 2. Automated setup (creates venv, starts Docker services, runs migrations)
bash scripts/dev-setup.sh

# 3. Edit secrets in .env
vim .env

# 4. Start the API (in one terminal)
source .venv/bin/activate
uvicorn deploypilot.main:app --reload --port 8000

# 5. Start the worker (in another terminal)
source .venv/bin/activate
celery -A deploypilot.workers.celery_app worker --loglevel=info

# 6. Visit API docs
open http://localhost:8000/docs
```

Or use Docker Compose for the full stack:

```bash
docker compose up
# API:      http://localhost:8000/docs
# Flower:   http://localhost:5555
# Grafana:  http://localhost:3001  (admin/admin)
# Prometheus: http://localhost:9090
```

---

## Configuration

All configuration is environment-variable driven. See [.env.example](.env.example)
for a complete annotated reference.

Critical values that **must** be changed before production:

| Variable | Requirement |
|---|---|
| `SECRET_KEY` | 256-bit random value (`openssl rand -hex 32`) |
| `DATABASE_URL` | Point to production PostgreSQL |
| `GITHUB_APP_PRIVATE_KEY` | Your GitHub App RSA private key |
| `GITHUB_WEBHOOK_SECRET` | Match value configured on your GitHub App |

---

## API Reference

Interactive API documentation is auto-generated by FastAPI:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

### Authentication

All protected endpoints require a JWT Bearer token or `X-API-Key` header.

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"you","display_name":"Your Name","password":"Secret1!"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"Secret1!"}' | jq -r .access_token)

# Create organization
curl -X POST http://localhost:8000/api/v1/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp"}'
```

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Obtain access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| GET/POST | `/api/v1/organizations` | List / create organizations |
| GET/POST | `/api/v1/organizations/{id}/workspaces` | Manage workspaces |
| POST | `/api/v1/organizations/{id}/workspaces/{id}/lock` | Lock workspace |
| POST | `/api/v1/projects/{id}/runs` | Trigger infrastructure run |
| GET | `/api/v1/projects/{id}/runs` | List run history |
| POST | `/api/v1/projects/{id}/runs/{id}/approve` | Approve pending run |
| POST | `/api/v1/projects/{id}/runs/{id}/reject` | Reject pending run |
| POST | `/api/v1/webhooks/github` | GitHub App webhook ingestion |
| GET | `/api/v1/organizations/{id}/audit` | Query audit logs |
| GET | `/health/ready` | Readiness probe |
| GET | `/metrics` | Prometheus metrics |

---

## CI/CD Pipeline

The GitHub Actions pipeline in [.github/workflows/ci.yml](.github/workflows/ci.yml)
runs on every push and pull request:

```
push/PR
  │
  ├── lint          ruff + black + mypy
  ├── security      bandit + safety + trivy
  ├── unit-tests    pytest (no external services needed)
  ├── terraform-validate  fmt + validate all modules
  │
  └── [on main only]
      ├── integration-tests  (real postgres + redis)
      ├── build              docker buildx → GHCR
      └── deploy-staging     kubectl apply kustomize overlay
```

**Run locally:**

```bash
# Lint
ruff check deploypilot/ && black --check deploypilot/

# Unit tests (no Docker needed)
pytest tests/unit/ -v

# Integration tests (requires Docker services)
docker compose up -d postgres redis
pytest tests/integration/ -v

# Terraform validate
terraform -chdir=terraform/modules/networking validate
```

---

## Infrastructure Provisioning

DeployPilot's own cloud infrastructure is managed with Terraform:

```bash
cd terraform/environments/production

# Initialize (first time)
terraform init

# Preview changes
terraform plan -var="db_password=$DB_PASSWORD"

# Apply
terraform apply -var="db_password=$DB_PASSWORD"
```

**Modules:**

| Module | What it creates |
|---|---|
| `networking` | VPC, subnets, NAT gateways, security groups |
| `database` | RDS PostgreSQL 16 (Multi-AZ, encrypted, backups) |
| Production env | EKS cluster, ElastiCache Redis, S3, DynamoDB state lock |

Remote state is stored in S3 with DynamoDB locking.

---

## Deployment

**Kubernetes (production):**

```bash
# Apply base + staging overlay
kubectl apply -k k8s/overlays/staging

# Apply base + production overlay
kubectl apply -k k8s/overlays/production

# Monitor rollout
kubectl rollout status deployment/deploypilot-api -n deploypilot
kubectl rollout status deployment/deploypilot-worker -n deploypilot

# Check pod logs
kubectl logs -l app=deploypilot-api -n deploypilot --tail=100
```

**Database migrations (run once per deploy):**

```bash
# Inside an api pod or migration job
alembic upgrade head
```

---

## Observability

| Signal | Endpoint / Tool |
|---|---|
| Metrics | `GET /metrics` → Prometheus scrapes → Grafana dashboards |
| Logs | JSON structured logs via structlog → CloudWatch / ELK |
| Health | `GET /health/live` (liveness), `GET /health/ready` (readiness) |
| Celery tasks | Flower UI at `:5555` |

**Custom metrics exposed:**

- `deploypilot_runs_total{trigger, status}` — run counter
- `deploypilot_run_duration_seconds{status}` — plan + apply latency histogram
- `deploypilot_active_runs` — current in-flight gauge
- `deploypilot_approvals_pending` — pending approval count
- `deploypilot_policy_violations_total{policy_type}` — policy hit counter

---

## Security

| Control | Implementation |
|---|---|
| Password storage | bcrypt with cost factor 12 |
| JWT tokens | HS256, short-lived access (60 min) + refresh (30 days) |
| API keys | SHA-256 hashed at rest, never stored in plain text |
| Secret injection | Fernet symmetric encryption at rest (KMS in production) |
| Webhook verification | HMAC-SHA256 signature check on all GitHub events |
| Rate limiting | Sliding-window per-IP via Redis |
| RBAC | Role hierarchy enforced on every service method |
| Audit logging | Immutable append-only trail for all mutations |
| Container hardening | Non-root user, read-only filesystem, dropped capabilities |
| TLS | Terminated at ALB / Nginx; enforced via cert-manager on K8s |
| Network isolation | App tier only accepts traffic from ALB security group |

---

## Troubleshooting

**API fails to start — "Cannot connect to database"**
```bash
# Check postgres is running
docker compose ps postgres
# Check the DATABASE_URL in .env matches docker-compose.yml
```

**Celery tasks are not executing**
```bash
# Verify the worker is running and connected to Redis
celery -A deploypilot.workers.celery_app inspect active
# Check broker URL matches between API and worker
```

**GitHub webhook returns 401**
```bash
# GITHUB_WEBHOOK_SECRET in .env must match what's configured in the GitHub App settings
# Regenerate the secret and redeploy both sides
```

**Terraform plan fails in worker**
```bash
# Check TERRAFORM_BINARY_PATH points to a valid terraform binary
which terraform
terraform version
# Verify the run's workspace/project has valid AWS credentials set as secrets
```

**Migrations fail on startup**
```bash
# Run migrations manually
alembic upgrade head
# Check DATABASE_URL has correct credentials
alembic history  # see applied revisions
```

---

## Contributing

1. Fork the repository and create a feature branch from `develop`
2. Follow the coding standards: ruff, black, mypy
3. Write tests for all new service methods
4. Open a pull request — the CI pipeline must pass before merge
5. One approval required from a maintainer

---

## Roadmap

- [ ] GitLab and Bitbucket VCS integrations
- [ ] Infracost integration for cost estimation in plan comments
- [ ] OPA (Open Policy Agent) support for custom policy rules
- [ ] Drift detection scheduled runs
- [ ] Workspace variable UI (manage TF variables per workspace)
- [ ] SSO / SAML 2.0 enterprise authentication
- [ ] Self-hosted runner support
- [ ] Billing and usage tracking module
- [ ] CLI tool (`deploypilot plan`, `deploypilot apply`)
- [ ] Terraform module registry integration

---

*© 2025 CloudForge Technologies — DeployPilot v1.0.0*
