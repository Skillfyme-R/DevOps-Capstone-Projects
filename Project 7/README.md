# ⬡ VaultFlow — Financial Intelligence Platform

> **Every dollar. Every decision. In focus.**

VaultFlow is a production-grade FinTech SaaS platform that provides real-time financial analytics, expense intelligence, budget management, cash-flow forecasting, payment reconciliation, and portfolio monitoring — all in a single, Kubernetes-native platform built for enterprise scale.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local)](#quick-start-local)
- [Docker Compose](#docker-compose)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Helm Chart](#helm-chart)
- [Terraform Infrastructure](#terraform-infrastructure)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Observability](#observability)
- [CI/CD Pipeline](#cicd-pipeline)
- [Development Guide](#development-guide)
- [Verification Checklist](#verification-checklist)
- [License](#license)

---

## Overview

VaultFlow is built by **VaultFlow Technologies** to solve the core challenge enterprises face: financial data fragmented across dozens of accounts, payment processors, investment platforms, and cloud cost centres — with no unified intelligence layer.

### What VaultFlow Does

| Capability | Description |
|---|---|
| **Expense Intelligence** | Real-time categorisation and aggregation of all spend |
| **Budget Tracking** | Variance analysis with automated alerts at configurable thresholds |
| **Cash-Flow Analytics** | Period-over-period inflow/outflow analysis |
| **Spending Forecasts** | Linear regression + confidence intervals for 1–12 month horizons |
| **Payment Reconciliation** | Match external payment records against internal transactions |
| **Portfolio Insights** | Holdings, P&L, and weight distribution across asset classes |
| **Alerting** | Severity-tiered alerts (info / warning / critical) with resolution tracking |
| **Prometheus Metrics** | First-class observability with 15+ custom metrics |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        VaultFlow Platform                          │
│                                                                    │
│  ┌─────────────┐    ┌──────────────────────────────────────────┐  │
│  │  React UI   │    │            Go API Server                 │  │
│  │  (Port 3000)│───▶│  ┌────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  Dashboard  │    │  │  Auth  │ │ Analytics│ │ Forecast │  │  │
│  └─────────────┘    │  └────────┘ └──────────┘ └──────────┘  │  │
│                     │  ┌────────┐ ┌──────────┐ ┌──────────┐  │  │
│  ┌─────────────┐    │  │Budgets │ │Reconcile │ │Portfolio │  │  │
│  │  Prometheus │◀───│  └────────┘ └──────────┘ └──────────┘  │  │
│  │  (Port 9091)│    │       (Port 9090)                       │  │
│  └──────┬──────┘    └─────────────────┬────────────────────────┘  │
│         │                             │                            │
│  ┌──────▼──────┐              ┌───────▼────────┐                  │
│  │   Grafana   │              │   Data Layer   │                  │
│  │  Dashboards │              │ PostgreSQL│Redis│                  │
│  └─────────────┘              └────────────────┘                  │
└────────────────────────────────────────────────────────────────────┘

         Deployed on Kubernetes (GKE) via Helm + Terraform
```

### Design Principles

- **Clean Architecture** — Domain models (`core/`) are independent of infrastructure (`pkg/provider`, `pkg/api`)
- **Provider Pattern** — External financial data sources implement a single `Provider` interface, enabling hot-swap without code changes
- **Kubernetes-Native** — Graceful shutdown, health probes, HPA, PDB, and Prometheus annotations built in from day one
- **Security by Default** — Non-root containers, read-only root filesystem, capabilities dropped, secrets via K8s Secrets
- **Observability First** — Structured JSON logs via zerolog, 15+ Prometheus metrics, Grafana dashboards

---

## Features

### Financial Analytics Engine

- **Expense Aggregation** — Groups expenses by category, vendor, and day; computes percentage breakdowns
- **Cash-Flow Computation** — Monthly inflow/outflow grouping with net-flow accumulation
- **Budget Variance Engine** — Compares actual vs allocated with `on_track / warning / exceeded / underspend` classification
- **Linear Regression Forecasting** — Projects future spend with upper/lower confidence bounds

### API

RESTful JSON API with versioned routes (`/api/v1`), API-key authentication, and full CORS support.

### Dashboards

- **Overview** — KPI cards, daily spend bar chart, category doughnut, recent alerts
- **Transactions** — Searchable table with status badges
- **Budgets** — Per-budget utilisation progress bars with variance detail
- **Forecasting** — Line chart with confidence bands + per-month forecast cards

---

## Technology Stack

| Layer | Technology |
|---|---|
| API Server | Go 1.22, Gin, zerolog, Cobra, Viper |
| Financial Engine | shopspring/decimal (arbitrary precision), custom ML forecasting |
| Frontend | React 18, TypeScript, TanStack Query, Chart.js |
| Metrics | Prometheus client_golang, Grafana |
| Containerisation | Docker (multi-stage, distroless) |
| Orchestration | Kubernetes, Kustomize, Helm v3 |
| Infrastructure | Terraform (GCP: GKE, Cloud SQL, Memorystore, VPC) |
| CI/CD | GitHub Actions (CI + CD to staging/production) |
| Cache | Redis 7 |

---

## Project Structure

```
Project 7/
├── cmd/vaultflow/          # Application entry point
├── core/                   # Domain module (no external deps)
│   └── pkg/
│       ├── model/          # Canonical financial types
│       ├── analytics/      # Expense & cash-flow aggregation
│       ├── budget/         # Budget variance engine
│       ├── forecast/       # Linear regression forecasting
│       └── reconcile/      # Payment reconciliation
├── pkg/
│   ├── api/                # HTTP handlers, router, in-memory store
│   ├── cmd/                # CLI (serve, version)
│   ├── config/             # Viper-based config loading
│   ├── env/                # Typed environment variables
│   ├── metrics/            # Prometheus registry
│   ├── middleware/          # Gin middleware (auth, CORS, logging)
│   └── provider/           # External data source interface + mock
├── ui/                     # React TypeScript dashboard
│   └── src/
│       ├── pages/          # Overview, Transactions, Budgets, Forecasts
│       ├── components/     # Sidebar, MetricCard
│       ├── services/       # Axios API client + types
│       └── styles/         # Design tokens (theme.ts)
├── deploy/
│   ├── kubernetes/base/    # Kustomize manifests (Deployment, Service, Ingress, HPA, PDB)
│   ├── helm/vaultflow/     # Helm chart
│   ├── terraform/
│   │   ├── modules/gcp/    # GKE, Cloud SQL, Memorystore, VPC
│   │   └── environments/   # production / staging
│   └── nginx/              # Nginx config for UI container
├── configs/                # vaultflow.yaml, prometheus.yml
├── .github/workflows/      # CI (lint/test/scan/build) + CD (staging/production)
├── Dockerfile              # Multi-stage API image (distroless)
├── Dockerfile.ui           # Multi-stage UI image (nginx)
├── docker-compose.yml      # Full local stack (API, UI, Redis, Prometheus, Grafana)
├── Makefile                # Developer commands
└── go.mod / go.sum
```

---

## Quick Start (Local)

### Prerequisites

- Go 1.22+
- Node 20+
- Docker + Docker Compose
- `make`

### Build & Run API

```bash
# Build binary
make build

# Run with defaults (no config file required for dev)
./bin/vaultflow serve

# API available at http://localhost:9090
# Metrics at     http://localhost:9091/metrics
```

### Run UI Dev Server

```bash
make ui-install
make ui-dev
# Dashboard at http://localhost:3000
```

---

## Docker Compose

The fastest way to run the complete platform locally:

```bash
make compose-up
```

Services started:

| Service | URL |
|---|---|
| VaultFlow API | http://localhost:9090 |
| VaultFlow UI | http://localhost:3000 |
| Prometheus Metrics | http://localhost:9091/metrics |
| Prometheus UI | http://localhost:9292 |
| Grafana | http://localhost:3001 (admin/vaultflow) |
| Redis | localhost:6379 |

```bash
# Stop and clean up
make compose-down
```

---

## Kubernetes Deployment

### With Kustomize (base)

```bash
# Apply all base manifests to the vaultflow namespace
kubectl apply -k deploy/kubernetes/base

# Verify rollout
kubectl rollout status deployment/vaultflow-api -n vaultflow

# Check pods
kubectl get pods -n vaultflow
```

### Secrets

Before deploying, populate the secrets:

```bash
kubectl create secret generic vaultflow-secrets \
  --from-literal=jwt-secret="YOUR_STRONG_SECRET" \
  --from-literal=database-url="postgres://..." \
  --from-literal=redis-url="redis://..." \
  -n vaultflow
```

---

## Helm Chart

```bash
# Add repo (if published)
helm repo add vaultflow https://charts.vaultflow.io
helm repo update

# Install from local chart
helm install vaultflow deploy/helm/vaultflow \
  --namespace vaultflow \
  --create-namespace \
  --set api.secrets.jwtSecret="YOUR_SECRET" \
  --set api.secrets.databaseUrl="postgres://..."

# Upgrade
helm upgrade vaultflow deploy/helm/vaultflow \
  --namespace vaultflow \
  --set api.image.tag=1.1.0 \
  --atomic

# Uninstall
helm uninstall vaultflow -n vaultflow
```

---

## Terraform Infrastructure (GCP)

```bash
cd deploy/terraform/environments/production

# Initialise backend
terraform init \
  -backend-config="bucket=vaultflow-terraform-state-prod"

# Plan
terraform plan \
  -var="gcp_project_id=my-project" \
  -var="jwt_secret=secret" \
  -var="database_url=postgres://..."

# Apply
terraform apply
```

**Resources provisioned:**

- GKE Autopilot cluster with private nodes
- VPC + subnets with secondary ranges for pods/services
- Cloud SQL PostgreSQL 16 (HA in production)
- Cloud Memorystore Redis 7 (HA in production)
- Workload Identity binding

---

## API Reference

### Base URL

```
http://localhost:9090
```

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/readyz` | Readiness check |
| `GET` | `/metrics` | Prometheus metrics (port 9091) |

### Transactions

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/transactions` | List transactions (`?start=&end=`) |
| `POST` | `/api/v1/transactions` | Create transaction |

### Expenses

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/expenses/summary` | Aggregated expense summary |

### Budgets

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/budgets` | List budgets |
| `GET` | `/api/v1/budgets/variance` | Budget variance analysis |

### Forecasting

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/forecasts` | 3-month spending forecast |

### Portfolio

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/portfolio` | Portfolio holdings & P&L |

### Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/alerts` | List active alerts |

---

## Configuration

Configuration is loaded from `configs/vaultflow.yaml` with environment variable overrides (prefix `VAULTFLOW_`).

| Key | Env Var | Default | Description |
|---|---|---|---|
| `server.port` | `VAULTFLOW_SERVER_PORT` | `9090` | API listen port |
| `server.metrics_port` | `VAULTFLOW_SERVER_METRICS_PORT` | `9091` | Metrics port |
| `auth.jwt_secret` | `VAULTFLOW_AUTH_JWT_SECRET` | — | JWT signing key |
| `database.url` | `VAULTFLOW_DATABASE_URL` | — | Database connection string |
| `cache.url` | `VAULTFLOW_CACHE_URL` | `redis://localhost:6379` | Redis URL |
| `logging.level` | `VAULTFLOW_LOGGING_LEVEL` | `info` | Log level |
| `features.forecasting` | `VAULTFLOW_FEATURES_FORECASTING` | `true` | Enable forecasting |

---

## Observability

### Prometheus Metrics

All metrics share the `vaultflow_` namespace:

| Metric | Type | Description |
|---|---|---|
| `vaultflow_http_requests_total` | Counter | HTTP requests by method/path/status |
| `vaultflow_http_request_duration_seconds` | Histogram | Request latency |
| `vaultflow_http_active_requests` | Gauge | In-flight requests |
| `vaultflow_finance_transactions_processed_total` | Counter | Processed transactions |
| `vaultflow_finance_transaction_amount` | Histogram | Transaction amount distribution |
| `vaultflow_reconciliation_runs_total` | Counter | Reconciliation run outcomes |
| `vaultflow_reconciliation_duration_seconds` | Histogram | Reconciliation duration |
| `vaultflow_alerting_generated_total` | Counter | Alerts by severity |
| `vaultflow_budget_utilization_percent` | Gauge | Budget utilisation per category |
| `vaultflow_cache_hits_total` | Counter | Cache hits by key type |
| `vaultflow_provider_sync_duration_seconds` | Histogram | Provider sync latency |

---

## CI/CD Pipeline

### CI (`ci.yml`) — triggered on push/PR

1. **Go Quality** — golangci-lint + race-condition tests + coverage upload
2. **UI Quality** — TypeScript type-check + ESLint + production build
3. **Security Scan** — Trivy filesystem scan with SARIF upload to GitHub Security
4. **Docker Build** — Multi-platform (`linux/amd64`, `linux/arm64`) with layer caching
5. **Terraform Validate** — Module init + validate + Helm lint

### CD (`cd.yml`) — triggered on version tag or manual dispatch

1. **Deploy Staging** — Helm upgrade to GKE staging cluster (atomic, 10 min timeout)
2. **Deploy Production** — After staging success; 15 min timeout with rollback on failure

---

## Development Guide

### Running Tests

```bash
# All Go tests with race detector
make test

# Specific package
go test ./core/pkg/analytics/... -v

# With coverage report
go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out
```

### Adding a New API Endpoint

1. Define types in `core/pkg/model/` if new domain objects are needed
2. Add handler function to `pkg/api/handlers.go`
3. Add store interface method to `pkg/api/store.go`
4. Implement on `MemoryStore` in `pkg/api/store.go`
5. Register route in `pkg/api/router.go`
6. Add corresponding UI page in `ui/src/pages/`

### Adding a Financial Provider

Implement the `provider.Provider` interface in `pkg/provider/`:

```go
type Provider interface {
    Name() string
    FetchTransactions(ctx, accountID string, start, end time.Time) ([]model.Transaction, error)
    FetchBalance(ctx, accountID string) (model.Money, error)
    Ping(ctx) error
}
```

Register with `provider.Registry.Register(myProvider)`.

---

## Verification Checklist

### Build Validation

- [x] `go build ./...` — compiles without errors
- [x] `go vet ./...` — no static analysis issues
- [x] Core module (`core/`) compiles independently
- [x] `npm run build` — React production bundle generated

### Runtime Testing

- [x] `GET /health` returns `{"status":"ok"}`
- [x] `GET /api/v1/transactions` returns 200 with empty array
- [x] `POST /api/v1/transactions` creates a transaction
- [x] `GET /api/v1/expenses/summary` computes aggregations
- [x] `GET /api/v1/budgets/variance` returns variance results
- [x] `GET /api/v1/forecasts` runs linear regression
- [x] `GET /metrics` (port 9091) exposes Prometheus data

### Infrastructure Validation

- [x] `docker build -f Dockerfile .` — API image builds
- [x] `docker build -f Dockerfile.ui .` — UI image builds
- [x] `docker compose up` — all services start and pass health checks
- [x] `kubectl apply -k deploy/kubernetes/base` — all resources created
- [x] `helm lint deploy/helm/vaultflow` — chart lints cleanly
- [x] `terraform validate` (gcp module) — configuration is valid

### Security

- [x] API key authentication enforced on `/api/v1`
- [x] Containers run as non-root (UID 65532)
- [x] Read-only root filesystem
- [x] All capabilities dropped
- [x] Secrets stored in Kubernetes Secrets, not ConfigMaps
- [x] TLS termination at Ingress

### Observability

- [x] Prometheus metrics exposed at `:9091/metrics`
- [x] Structured JSON logs with zerolog
- [x] All HTTP requests emit latency + status metrics
- [x] Reconciliation and budget metrics tracked

---

## License

VaultFlow is released under the [Apache License 2.0](LICENSE).

This platform was architecturally inspired by the engineering patterns of [OpenCost](https://github.com/opencost/opencost) (Apache 2.0), while representing a fully original implementation for a distinct business domain.

---

*Built with precision by VaultFlow Technologies · [vaultflow.io](https://vaultflow.io)*
