# NexaFlow Architecture Overview

## System Context

NexaFlow operates as a multi-tenant SaaS platform. Each tenant (Organisation) gets
isolated data while sharing the same compute infrastructure. Row-level isolation is
enforced at the application layer — every query is scoped to `organization_id`.

## Component Breakdown

### nexaflow-server (Go)

The server is a single binary that embeds the compiled React web UI and serves both
the API and the static frontend. This eliminates a separate CDN or web-server process.

**Internal composition:**

```
cmd/server/main.go
  └── pkg/server/server.go          ← cobra command, HTTP server bootstrap
        ├── pkg/database/           ← PostgreSQL client + health checks
        ├── pkg/bus/                ← in-process event bus (goroutine fanout)
        ├── pkg/scheduler/          ← cron-style recurring jobs (robfig/cron)
        ├── pkg/telemetry/          ← OTLP tracing initialisation
        ├── pkg/metric/             ← Prometheus metric registration
        └── pkg/apis/               ← domain API handlers
              ├── auth/             ← JWT authentication
              ├── dashboard/        ← aggregated overview
              ├── shipment/         ← shipment CRUD + status machine
              ├── warehouse/        ← warehouse + zone management
              ├── inventory/        ← stock tracking + movements
              ├── fleet/            ← vehicle + driver registry
              ├── route/            ← TSP route optimisation
              ├── order/            ← order fulfilment lifecycle
              ├── supplier/         ← supplier relationship management
              ├── analytics/        ← KPI aggregation + trend queries
              ├── workflow/         ← workflow engine + execution
              └── health/           ← /healthz + /readyz probes
```

### React Web UI

Built with Vite + React 18 + TailwindCSS. State management is split:

- **Server state**: React Query (caching, background refresh, optimistic updates)
- **Auth state**: Zustand with localStorage persistence
- **UI state**: local React state

### Event Bus

The in-process `pkg/bus` event bus decouples domain services. When a shipment
status changes, the shipment handler publishes to `shipment.status_updated`;
the workflow handler subscribes and triggers dependent automation without
coupling the two packages.

### Scheduler

Background jobs run on the event loop alongside the API server:

| Job | Schedule | Purpose |
|-----|----------|---------|
| low-stock-check | Every 30 min | Detect items below reorder point |
| shipment-eta-refresh | Every 15 min | Recalculate ETA from carrier feeds |
| fleet-telematics-sync | Every 5 min | Pull GPS pings from telematics API |
| daily-analytics-rollup | 01:00 daily | Pre-aggregate 30-day KPIs |
| supplier-performance-report | Mon 06:00 | Weekly SLA score recompute |

## Data Flow — Shipment Lifecycle

```
Client → POST /api/v1/shipments
  └─► ShipmentDAO.Create()
        └─► INSERT INTO shipments
        └─► EventBus.Publish(TopicShipmentCreated)
              ├─► WorkflowHandler.onShipmentCreated()  (async)
              └─► InventoryHandler.reserveStock()       (async)

Driver App → PATCH /api/v1/shipments/{id}  { status: "in_transit" }
  └─► ShipmentDAO.UpdateStatus()
        ├─► UPDATE shipments SET status=...
        └─► INSERT INTO shipment_events
        └─► EventBus.Publish(TopicShipmentUpdated)

Driver App → PATCH /api/v1/shipments/{id}  { status: "delivered" }
  └─► ShipmentDAO.UpdateStatus()  (sets actual_delivery)
        └─► EventBus.Publish(TopicShipmentDelivered)
              └─► OrderDAO.LinkShipment()              (async)
```

## Route Optimisation Algorithm

NexaFlow uses a **Nearest-Neighbour TSP heuristic** implemented in Go without
external dependencies:

1. Start at the depot
2. Greedily pick the closest unvisited stop (Haversine great-circle distance)
3. Repeat until all stops are visited, then return to depot
4. Post-sort by time-window deadline to satisfy time constraints

This gives an O(n²) solution that is fast enough for typical route sizes (≤200
stops) and produces routes within ~20–25% of optimal. A more sophisticated
solver (Lin-Kernighan, OR-Tools) can be plugged in by replacing
`nearestNeighborTSP` in `pkg/apis/route/handler.go`.

## Security Model

- **Authentication**: JWT (HS256) with 24h expiry; refresh flow supported
- **Authorisation**: role field in JWT claims checked per-handler
- **Password storage**: bcrypt (cost 12)
- **Transport**: TLS required in production (cert-manager + Let's Encrypt)
- **Container**: distroless non-root image, read-only root filesystem
- **Network**: all services communicate within the cluster; only the Ingress is externally exposed
- **Secrets**: never committed to git; injected via Kubernetes Secrets or Vault

## Scalability

- API server is stateless — scales horizontally via HPA
- Redis handles distributed rate-limiting and session caching
- Database connections are pooled (`MaxOpenConns=25` per instance)
- Read-heavy analytics queries can be routed to a read replica by changing the DB URL
- PostGIS geospatial indexes support warehouse proximity queries at scale
