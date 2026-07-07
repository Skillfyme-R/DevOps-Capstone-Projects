# NexaFlow — Intelligent Logistics Orchestration Platform

> **Every shipment, orchestrated.**

NexaFlow is an enterprise-grade, open-source **Logistics & Supply Chain SaaS platform** that gives operations teams a single control plane for shipments, warehouses, inventory, fleet, routes, orders, suppliers, and fulfilment workflows — from development to global production scale.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Observability](#observability)
- [Contributing](#contributing)
- [License](#license)
- [Attribution](#attribution)

---

## Overview

NexaFlow transforms the complexity of modern logistics operations into clean, programmable workflows. Whether you're running a single regional warehouse or a global multi-modal supply chain, NexaFlow provides:

- **Real-time shipment tracking** with event-driven status updates
- **Warehouse & zone management** with bin-level inventory visibility
- **Fleet telematics** and live vehicle location tracking
- **AI-assisted route optimisation** using Nearest-Neighbour TSP heuristics
- **Order fulfilment orchestration** with configurable workflow engine
- **Supplier performance monitoring** with SLA scoring
- **Analytics dashboards** with KPI roll-ups, revenue trends, and fleet utilisation

### Brand Identity

| Element     | Value                          |
|-------------|-------------------------------|
| Company     | NexaFlow Logistics, Inc.       |
| Domain      | nexaflow.io                    |
| Primary     | `#0D1B2A` Deep Navy            |
| Accent      | `#00D4FF` Electric Cyan        |
| Signal      | `#FF6B35` Signal Orange        |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NexaFlow Platform                           │
│                                                                     │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐  │
│  │   React Web UI (SPA) │    │     nexaflow-server (Go)         │  │
│  │                      │    │                                  │  │
│  │  • Dashboard         │◄───►  • REST API (8080)               │  │
│  │  • Shipment Mgmt     │    │  • Prometheus Metrics (9090)     │  │
│  │  • Warehouse Mgmt    │    │  • WebSocket (live updates)      │  │
│  │  • Fleet Tracking    │    │                                  │  │
│  │  • Route Planner     │    │  pkg/                            │  │
│  │  • Order Fulfilment  │    │  ├── apis/        (HTTP handlers)│  │
│  │  • Supplier Portal   │    │  ├── dao/         (DB access)    │  │
│  │  • Analytics         │    │  ├── bus/         (events)       │  │
│  └──────────────────────┘    │  ├── scheduler/   (cron jobs)    │  │
│                              │  ├── workflow/    (orchestration) │  │
│                              │  ├── metric/      (prometheus)   │  │
│                              │  └── telemetry/   (OTLP tracing) │  │
│                              └──────────────────────────────────┘  │
│                                          │                          │
│        ┌─────────────────────────────────┼───────────────┐         │
│        ▼                                 ▼               ▼         │
│  ┌──────────┐                    ┌──────────┐   ┌──────────────┐  │
│  │PostgreSQL│                    │  Redis   │   │ OpenTelemetry│  │
│  │   16     │                    │  7       │   │  Collector   │  │
│  │          │                    │          │   │              │  │
│  │ Schemas: │                    │ • Cache  │   │ → Jaeger     │  │
│  │  - orgs  │                    │ • Pub/Sub│   │ → Grafana    │  │
│  │  - users │                    │ • Limits │   │              │  │
│  │  - ships │                    └──────────┘   └──────────────┘  │
│  │  - whs   │                                                      │
│  │  - inv   │   ┌──────────────────────────────────────────────┐  │
│  │  - fleet │   │           Kubernetes (EKS)                   │  │
│  │  - orders│   │  • 3 replicas HPA → 20                       │  │
│  │  - wflows│   │  • PodDisruptionBudget (minAvailable=1)       │  │
│  └──────────┘   │  • Rolling updates (zero-downtime)           │  │
│                  │  • NGINX Ingress + cert-manager TLS          │  │
│                  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Domain Model

```
Organization
 ├── Users (RBAC: admin | manager | operator | viewer)
 ├── Warehouses ──► Zones ──► InventoryItems ──► Movements
 ├── Vehicles (Fleet) ──► Drivers
 ├── Suppliers
 ├── Orders ──► LineItems ──► Shipments ──► ShipmentEvents
 └── WorkflowDefinitions ──► WorkflowExecutions ──► StepResults
```

---

## Tech Stack

| Layer          | Technology                                   |
|----------------|---------------------------------------------|
| Backend        | Go 1.22, `net/http`, PostgreSQL driver (pgx) |
| Frontend       | React 18, TypeScript, TailwindCSS v3, Recharts, Zustand |
| Database       | PostgreSQL 16 (PostGIS, pg_trgm)            |
| Cache / PubSub | Redis 7                                     |
| Observability  | Prometheus, Grafana, OpenTelemetry (OTLP)   |
| Container      | Docker (multi-stage, distroless runtime)    |
| Orchestration  | Kubernetes (EKS), Helm                     |
| IaC            | Terraform 1.8, AWS (VPC, EKS, RDS, ElastiCache, S3) |
| CI/CD          | GitHub Actions (lint → test → build → scan → deploy) |
| Auth           | JWT (HS256), bcrypt password hashing        |
| Route Opt.     | Nearest-Neighbour TSP heuristic (Haversine) |

---

## Features

### Shipment Management
- Create shipments with auto-generated NXF-XXXXXXXX tracking numbers
- Full lifecycle: `pending → picked_up → in_transit → out_for_delivery → delivered`
- Exception and return handling with event audit trail
- Public tracking endpoint (no auth required): `GET /api/v1/shipments/track/{number}`

### Warehouse Management
- Multi-warehouse support with GPS coordinates
- Zone-level layout (receiving, storage, picking, packing, shipping, cold chain, hazmat)
- Warehouse utilisation metrics fed to the analytics dashboard

### Inventory Tracking
- Bin-level stock with quantity-on-hand / reserved / available separation
- Atomic stock adjustments with full movement audit log
- Low-stock and out-of-stock alerts with configurable reorder points
- Expiry date tracking for perishable goods

### Fleet Management
- Vehicle registry (truck, van, motorcycle, cargo ship, air freight)
- Real-time GPS location updates via `PATCH /api/v1/fleet/vehicles/{id}/location`
- Driver assignment and status management
- Service schedule tracking with odometer readings

### Route Optimisation
- Nearest-Neighbour TSP solver for multi-stop delivery planning
- Modes: `fastest`, `economic`, `green`, `multi_stop`
- Time-window constraints per stop
- Distance (km), estimated hours, fuel, and CO₂ estimates in response

### Order Fulfilment
- Draft → Confirm → Process → Pack → Ship → Deliver lifecycle
- Line-item breakdown with SKU, quantity, and pricing
- Automatic shipment linking on dispatch

### Supplier Management
- Tiered supplier classification: premium, preferred, standard
- Lead time, payment terms, and performance rating tracking
- Category segmentation: manufacturer, distributor, carrier, 3PL, customs broker

### Workflow Engine
- Define multi-step logistics workflows as JSON step trees
- Trigger modes: manual, event-driven (domain events), scheduled
- Step types: pickup, inspection, sorting, loading, transit, delivery, signature, photo proof
- Full execution history with per-step timing and error capture

### Analytics
- 30-day KPI roll-ups: on-time delivery rate, avg transit hours, revenue
- Shipments-by-status breakdown (pie chart)
- Fleet utilisation gauge
- Revenue trend (line chart)
- Top corridors by shipment volume

---

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- Go 1.22+ (for local backend development)
- Node.js 20+ (for local frontend development)

### Run with Docker Compose

```bash
git clone https://github.com/nexaflow-io/nexaflow.git
cd nexaflow

# Start the full stack (API + DB + Redis + Prometheus + Grafana)
docker compose -f deploy/manifests/docker-compose.yaml up --build

# Apply database migrations (first run)
docker compose -f deploy/manifests/docker-compose.yaml exec postgres \
  psql -U nexaflow nexaflow -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

Services available after startup:

| Service        | URL                              | Credentials           |
|----------------|----------------------------------|-----------------------|
| Web UI         | http://localhost:3000            | admin@nexaflow.io / nexaflow_admin |
| API            | http://localhost:8080            | —                     |
| Grafana        | http://localhost:3001            | admin / nexaflow_grafana |
| Prometheus     | http://localhost:9091            | —                     |

### Health check

```bash
curl http://localhost:8080/healthz
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

## Development

```bash
# Install Go dependencies
go mod download

# Install frontend dependencies
cd web && npm install

# Run Go tests
make test-backend

# Run React tests
make test-frontend

# Lint everything
make lint

# Hot-reload backend (requires air)
make dev-backend

# Hot-reload frontend
make dev-frontend
```

---

## API Reference

All API endpoints are prefixed with `/api/v1`. Authentication uses Bearer JWT:

```
Authorization: Bearer <token>
X-NexaFlow-Org-ID: <org-uuid>
```

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Authenticate, receive JWT |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Invalidate token (client-side) |
| GET  | `/auth/me` | Current user info |

### Shipments

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/shipments` | List shipments (filterable by status) |
| POST   | `/shipments` | Create shipment |
| GET    | `/shipments/{id}` | Get shipment by ID |
| PATCH  | `/shipments/{id}` | Update status + emit event |
| DELETE | `/shipments/{id}` | Cancel shipment |
| GET    | `/shipments/track/{number}` | Public tracking (no auth) |

### Warehouses

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/warehouses` | List warehouses |
| POST   | `/warehouses` | Create warehouse |
| GET    | `/warehouses/{id}` | Get warehouse |
| PUT    | `/warehouses/{id}` | Update warehouse |
| DELETE | `/warehouses/{id}` | Deactivate warehouse |

### Fleet

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/fleet/vehicles` | List vehicles |
| POST   | `/fleet/vehicles` | Register vehicle |
| GET    | `/fleet/vehicles/available` | List available vehicles |
| GET    | `/fleet/vehicles/{id}` | Get vehicle |
| PATCH  | `/fleet/vehicles/{id}/location` | Update GPS location |
| PATCH  | `/fleet/vehicles/{id}/status` | Update status |
| PATCH  | `/fleet/vehicles/{id}/assign-driver` | Assign driver |

### Route Optimisation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/routes/optimize` | Compute optimised route |
| GET  | `/routes` | Route history |

### Orders

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/orders` | List orders |
| POST | `/orders` | Create order |
| GET  | `/orders/{id}` | Get order |
| POST | `/orders/{id}/confirm` | Confirm order |
| POST | `/orders/{id}/cancel` | Cancel order |

### Suppliers, Inventory, Analytics

See [docs/api/openapi.yaml](docs/api/openapi.yaml) for the full OpenAPI 3.1 specification.

---

## Database Schema

Core tables (PostgreSQL 16 + PostGIS):

```
organizations       → multi-tenant root
users               → RBAC-aware user accounts
warehouses          → physical facilities with GPS
warehouse_zones     → picking, packing, cold-chain zones
suppliers           → upstream vendors and carriers
inventory_items     → SKU-level stock per warehouse zone
inventory_movements → immutable audit log of all stock changes
vehicles            → fleet registry
drivers             → driver profiles and assignment
shipments           → in-flight and historical shipments
shipment_events     → immutable event log per shipment
orders              → customer orders with line items (JSONB)
workflow_definitions → reusable step-based workflow templates
workflow_executions  → per-run execution records with step results
```

Full schema: [`migrations/001_initial_schema.sql`](migrations/001_initial_schema.sql)

---

## Deployment

### Kubernetes (Helm)

```bash
# Deploy to staging
helm upgrade --install nexaflow ./deploy/helm/nexaflow \
  --namespace nexaflow \
  --create-namespace \
  --set image.tag=1.0.0 \
  --set environment=staging \
  --set-string config.dbUrl="$DB_URL" \
  --set-string config.jwtSecret="$JWT_SECRET"

# Check rollout
kubectl -n nexaflow rollout status deployment/nexaflow-server
```

### Terraform (AWS)

```bash
cd deploy/terraform

# Initialise backend
terraform init

# Plan staging
terraform plan \
  -var="environment=staging" \
  -var="db_password=$DB_PASSWORD" \
  -var="jwt_secret=$JWT_SECRET"

# Apply
terraform apply
```

### CI/CD

All merges to `main` trigger the [CI pipeline](.github/workflows/ci.yml):

1. Go lint (golangci-lint) + unit tests + race detection
2. TypeScript type-check + ESLint + Vitest
3. Migration validation against a real PostgreSQL instance
4. Multi-arch Docker build (amd64 + arm64) → GHCR push
5. Trivy vulnerability scan → GitHub Security tab

Production deploys are manually triggered via the [Deploy workflow](.github/workflows/deploy.yml).

---

## Configuration

All configuration is provided via environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXAFLOW_DB_URL` | ✅ | PostgreSQL connection string |
| `NEXAFLOW_REDIS_URL` | ❌ | Redis connection string |
| `NEXAFLOW_JWT_SECRET` | ✅ | JWT signing key (≥32 chars) |
| `NEXAFLOW_OTLP_ENDPOINT` | ❌ | OpenTelemetry collector gRPC endpoint |
| `LOG_LEVEL` | ❌ | `debug` `info` `warn` `error` (default: `info`) |

CLI flags mirror all variables; run `nexaflow-server --help` for the full list.

---

## Observability

### Metrics (Prometheus)

Scraped from `:9090/metrics`. Key metrics:

```
nexaflow_shipments_total{org_id, status}
nexaflow_shipments_transit_duration_hours{org_id, service_level}
nexaflow_orders_total{org_id, status}
nexaflow_fleet_vehicles_active{org_id}
nexaflow_fleet_vehicles_available{org_id}
nexaflow_api_request_duration_seconds{method, path, status_code}
nexaflow_workflow_executions_total{org_id, workflow_type, result}
nexaflow_route_optimization_duration_seconds{mode, stops}
```

### Distributed Tracing

Traces are exported via OTLP gRPC to the configured collector. Each HTTP request creates a root span. Database queries and event bus dispatches create child spans.

### Grafana Dashboards

Pre-built dashboards are provisioned automatically via `deploy/manifests/grafana/provisioning/`.

---

## Contributing

1. Fork the repository and create a feature branch
2. Run `make test` and `make lint` before committing
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a pull request — the CI pipeline runs automatically

Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for the full guide.

---

## License

NexaFlow is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for the full text.

---

## Attribution

NexaFlow is architecturally inspired by [Walrus](https://github.com/seal-io/walrus) (Seal Inc., Apache 2.0), an open-source application management platform. The logistics domain model, all business logic, all Go packages, all React components, database schema, and branding are entirely original implementations created for the NexaFlow platform. No source code from Walrus has been copied or adapted.

---

*© 2026 NexaFlow Logistics, Inc. — Skillfyme DevOps Capstone Project 6*
