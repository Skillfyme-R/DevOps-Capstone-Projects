# ⚡ FluxStream

> **Enterprise OTT Streaming Platform — Your Content. Infinite Scale.**

FluxStream is a production-grade SaaS platform for building, deploying, and scaling enterprise OTT (over-the-top) streaming services. Built with Elixir/Phoenix for the backend and React/TypeScript for the frontend, FluxStream provides everything you need to run a world-class video streaming business.

---

## Features

### For Viewers
- **Content Catalog** — Browse, search, and discover 10,000+ titles across genres
- **Adaptive Streaming** — HLS/DASH with automatic quality selection (SD to 4K UHD)
- **Viewing Profiles** — Multiple profiles per account (kids, teen, adult modes)
- **Watchlist & History** — Save content and resume where you left off
- **Offline Downloads** — Download for offline viewing (Premium plans)
- **Real-time Chat** — Live event chat via Phoenix Channels WebSockets
- **Multi-device Streaming** — Watch on web, mobile, TV simultaneously

### For Studios (Content Publishers)
- **Studio Dashboard** — Upload, manage, and publish movies, series, and live events
- **Transcoding Pipeline** — Automatic multi-profile video transcoding (HLS output)
- **Revenue Analytics** — View counts, engagement metrics, payout tracking
- **DRM & Access Control** — Token-signed streams, geo-restriction, age gating
- **Webhook Integrations** — Event-driven notifications to external systems

### For Platform Admins
- **CDN Network** — Manage global edge nodes across 8+ regions
- **Account Management** — Tenant onboarding, RBAC, SSO/OIDC configuration
- **Subscription Billing** — Stripe-powered plans with trials, upgrades, and payouts
- **Audit Logging** — Immutable audit trail for all platform events
- **Support Dashboard** — Triage and resolve viewer playback issues

### Platform
- **White-label B2B** — Custom domains, branding, and SSO for enterprise tenants
- **Multi-region CDN** — 8 global edge nodes with automatic load balancing
- **GraphQL API** — Fully typed API with subscriptions for real-time features
- **99.99% SLA** — Built for enterprise reliability (Enterprise plan)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FluxStream Platform                  │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  React SPA        │    │   Elixir Umbrella App    │   │
│  │  (Vite + Apollo)  │◄──►│                          │   │
│  │                  │    │  ┌──────┐  ┌───────────┐  │   │
│  │  • Catalog       │    │  │ API  │  │  GraphQL  │  │   │
│  │  • Player        │    │  │ :4000│  │   :4001   │  │   │
│  │  • Studio        │    │  └──────┘  └───────────┘  │   │
│  │  • Billing       │    │  ┌──────┐  ┌───────────┐  │   │
│  │  • CDN Dashboard │    │  │ RTC  │  │  Worker   │  │   │
│  │  • Support       │    │  │ :4002│  │  (Jobs)   │  │   │
│  └──────────────────┘    │  └──────┘  └───────────┘  │   │
│                          │  ┌──────┐  ┌───────────┐  │   │
│                          │  │Email │  │   Cron    │  │   │
│                          │  └──────┘  └───────────┘  │   │
│                          │            Core Domain     │   │
│                          └──────────────────────────┘   │
│                                      │                  │
│         ┌────────────────────────────┼────────────┐     │
│         ▼              ▼             ▼            ▼     │
│    PostgreSQL      RabbitMQ      InfluxDB       Redis   │
│    (Main + CDN)   (Transcoding)  (Metrics)    (Cache)   │
└─────────────────────────────────────────────────────────┘
```

### Umbrella Application Structure

| App | Port | Responsibility |
|-----|------|----------------|
| `core` | — | Domain models, business logic, Ecto schemas |
| `api` | 4000 | REST API — webhooks, health, Stripe events |
| `graphql` | 4001 | GraphQL API — all client-facing queries/mutations |
| `rtc` | 4002 | Real-time — WebSocket channels for live streaming |
| `email` | — | Transactional email (SendGrid/SMTP) |
| `worker` | — | Background jobs — transcoding queue processor |
| `cron` | — | Scheduled tasks — analytics, cleanup, health checks |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Elixir 1.16, Phoenix 1.7 (Umbrella) |
| API | GraphQL (Absinthe) + REST |
| Frontend | React 18, TypeScript, Vite, Apollo Client |
| Database | PostgreSQL 16 (dual DB: main + CDN) |
| Messaging | RabbitMQ 3.13 (via Conduit) |
| Streaming Analytics | InfluxDB 2.7 |
| Cache | Redis 7 |
| Object Storage | S3 / MinIO (local dev) |
| Auth | Guardian (JWT), OAuth, OIDC, WorkOS |
| Payments | Stripe (subscriptions + payouts) |
| Real-time | Phoenix Channels (WebSockets) |
| CI/CD | GitHub Actions |
| Infra | Docker, Kubernetes, Helm 3 |
| Monitoring | Prometheus, Grafana, Telemetry |

---

## Quick Start

### Prerequisites

- Elixir 1.16+ ([asdf](https://asdf-vm.com/) recommended — see `.tool-versions`)
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/your-org/fluxstream.git
cd fluxstream

# 2. Start infrastructure (PostgreSQL, RabbitMQ, InfluxDB, Redis, MinIO)
docker compose up db cdn_db rabbitmq influxdb redis minio -d

# 3. Install Elixir dependencies
mix deps.get

# 4. Set up the database (create, migrate, seed)
mix ecto.setup

# 5. Start all backend services
mix phx.server

# 6. In another terminal — start the frontend
cd www && npm install && npm run dev
```

The app will be running at:
- **Frontend**: http://localhost:3000
- **GraphQL API**: http://localhost:4001/graphql
- **GraphQL Playground**: http://localhost:4001/graphql (dev only)
- **REST API**: http://localhost:4000
- **RabbitMQ Console**: http://localhost:15672 (fluxstream / fluxstream_dev)
- **MinIO Console**: http://localhost:9001 (fluxstream / fluxstream_dev_secret)

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASS=postgres
DB_NAME=fluxstream_dev

# Auth
SECRET_KEY_BASE=your-64-char-secret
JWT_SECRET=your-jwt-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage
STORAGE_BUCKET=fluxstream-dev
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-api-key
EMAIL_FROM=noreply@fluxstream.io
```

---

## Docker Deployment

```bash
# Build the production image
docker build -t fluxstream:latest .

# Run with docker-compose
docker compose up -d

# Run database migrations
docker compose exec api ./bin/fluxstream eval "Core.Release.migrate()"
```

---

## Kubernetes Deployment

```bash
# Add Bitnami charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create namespace
kubectl create namespace fluxstream

# Create secrets
kubectl create secret generic fluxstream-secrets \
  --namespace fluxstream \
  --from-literal=SECRET_KEY_BASE="$(openssl rand -base64 64)" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=DB_PASS="your-db-password" \
  --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_..."

# Install FluxStream
helm upgrade --install fluxstream ./helm/fluxstream \
  --namespace fluxstream \
  --values helm/fluxstream/values.yaml \
  --set image.tag=v1.0.0 \
  --wait
```

---

## API Reference

### Authentication

All API requests require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

Obtain a token via the `login` mutation:

```graphql
mutation Login {
  login(email: "user@example.com", password: "your-password") {
    token
    user { id name email role }
  }
}
```

### Key GraphQL Operations

```graphql
# Browse content catalog
query Catalog {
  featuredContent(limit: 5) { id title thumbnailUrl contentType }
  contents(status: PUBLISHED, orderBy: "popular") { id title genres }
}

# Subscribe to a plan
mutation Subscribe {
  createSubscription(planId: "plan-id", billingInterval: MONTHLY) {
    id status plan { name }
  }
}

# Report a playback issue
mutation ReportIssue {
  reportPlaybackIssue(
    title: "Video keeps buffering"
    description: "Every 30 seconds the video pauses for 10+ seconds"
    issueType: BUFFERING
    contentId: "content-id"
  ) { id status priority }
}
```

---

## Development

### Running Tests

```bash
# All Elixir tests
mix test

# With coverage
mix test --cover

# Frontend tests
cd www && npm test

# Type checking
cd www && npm run type-check
```

### Code Quality

```bash
# Elixir formatting
mix format

# Credo (linting)
mix credo --strict

# Sobelow (security audit)
mix sobelow

# Frontend linting
cd www && npm run lint
```

### Database Operations

```bash
# Create and migrate
mix ecto.create && mix ecto.migrate

# Reset (drop + recreate + migrate + seed)
mix ecto.reset

# Generate migration
mix ecto.gen.migration create_something

# Run specific migration
mix ecto.migrate --step 1
```

---

## Project Structure

```
fluxstream/
├── apps/
│   ├── core/           # Domain models, business logic
│   │   ├── lib/core/
│   │   │   ├── schema/         # Ecto schemas (OTT domain)
│   │   │   ├── services/       # Business logic services
│   │   │   ├── auth/           # Guardian, OAuth, OIDC
│   │   │   ├── pubsub/         # Phoenix PubSub topics
│   │   │   └── metrics/        # InfluxDB integration
│   │   └── priv/repo/
│   │       └── migrations/     # 8 migration files
│   ├── api/            # REST API (Phoenix)
│   ├── graphql/        # GraphQL API (Absinthe)
│   │   └── lib/graphql/
│   │       ├── resolvers/      # 6 resolver modules
│   │       ├── middleware/     # Auth, rate limit, error handling
│   │       └── schema.graphql  # Full GraphQL schema
│   ├── rtc/            # WebSocket real-time
│   ├── email/          # Email templates & delivery
│   ├── worker/         # Transcoding job processor
│   └── cron/           # Scheduled tasks
├── www/                # React frontend
│   └── src/
│       ├── components/ # UI components by feature
│       │   ├── auth/           # Login, Register
│       │   ├── catalog/        # Browse, Search, Content detail
│       │   ├── player/         # Video player
│       │   ├── studio/         # Studio management
│       │   ├── billing/        # Plans & subscriptions
│       │   ├── dashboard/      # CDN monitoring
│       │   ├── support/        # Playback issues
│       │   └── layout/         # Sidebar, TopNav, AppLayout
│       ├── contexts/           # Auth, Theme contexts
│       ├── graph/              # Apollo client setup
│       ├── theme.ts            # Design tokens
│       └── styles/             # Global CSS
├── helm/fluxstream/    # Kubernetes Helm chart
├── k8s/                # Raw Kubernetes manifests
├── config/             # Elixir config per env
├── .github/workflows/  # CI/CD pipelines
├── docker-compose.yml  # Local dev infrastructure
└── Dockerfile          # Multi-stage production build
```

---

## Domain Model Overview

| Schema | Purpose |
|--------|---------|
| `User` | Viewer/creator accounts with onboarding, SSO, role |
| `Account` | B2B tenant (white-label) with quota/tier config |
| `Studio` | Content publisher with payout and member management |
| `Content` | Movie/Series/Doc/Live with status workflow |
| `Episode` | Series episode with season/episode numbering |
| `Plan` | Subscription tier (Free/Standard/Premium/Enterprise) |
| `Subscription` | Stripe-backed viewer subscription |
| `ViewingProfile` | Per-user profile (Netflix-style) |
| `ViewingHistory` | Watch progress and session tracking |
| `Watchlist` | Saved content per profile |
| `CDNNode` | Edge node with capacity and health metrics |
| `StreamEndpoint` | CDN-delivered HLS/DASH URL per content |
| `TranscodingJob` | Video processing queue with retry logic |
| `PlaybackIssue` | Viewer support ticket with message thread |
| `Audit` | Immutable platform event log |
| `Webhook` | Studio event integrations |
| `DomainMapping` | White-label custom domain with SSL |
| `OIDCProvider` | Enterprise SSO configuration |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

### Commit Convention

```
feat: add 4K streaming endpoint selection
fix: resolve HLS token expiry race condition
docs: update CDN node provisioning guide
test: add transcoding job retry coverage
chore: upgrade Elixir to 1.16.2
```

---

## License

FluxStream is released under the [MIT License](LICENSE).

This project was architecturally inspired by [pluralsh/plural](https://github.com/pluralsh/plural) (AGPL-3.0 / MIT),
a Kubernetes management platform by Plural Labs, Inc.
The FluxStream codebase is a fully original implementation
adapted to the OTT/streaming domain with no source code from the reference project.

---

## About FluxStream Technologies

FluxStream Technologies is a fictional company created for educational and demonstration purposes.
The platform showcases production-grade Elixir/Phoenix + React architecture patterns
applied to the OTT streaming domain.

**Website**: https://fluxstream.io
**Support**: support@fluxstream.io
**Platform Status**: https://status.fluxstream.io
