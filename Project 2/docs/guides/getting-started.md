# VendorVault — Getting Started (Local Development)

## Prerequisites

| Tool       | Version | Purpose |
|------------|---------|---------|
| Node.js    | ≥ 18.12 | Runtime |
| Yarn       | ≥ 3.6   | Package manager |
| Docker     | ≥ 24    | Local infrastructure |
| Docker Compose | ≥ 2.20 | Multi-container orchestration |
| Git        | any     | Version control |

## Quick Start (5 minutes)

### 1. Clone and install

```bash
git clone https://github.com/your-org/vendorvault-platform.git
cd vendorvault-platform/"Project 2"
cp .env.example .env
yarn install
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
yarn infra:up
# Wait for healthy status (~20 seconds)
yarn infra:status
```

### 3. Run database migrations + seed demo data

```bash
yarn db:migrate
yarn db:seed
```

Seed creates these accounts (all with password `Password123!`):

| Role     | Email                         |
|----------|-------------------------------|
| Admin    | admin@vendorvault.io          |
| Vendor 1 | soundwave@vendorvault.io      |
| Vendor 2 | ecothreads@vendorvault.io     |
| Customer | customer@vendorvault.io       |

### 4. Start development servers

```bash
yarn start
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8008
# API Docs:  http://localhost:8008/healthz/ready
```

## Full Docker Stack

To run the complete platform in Docker (including frontend + backend):

```bash
yarn docker:up
yarn db:migrate
yarn db:seed
```

Access points:
- Marketplace:  http://localhost:3000
- API:          http://localhost:8008
- Database UI:  `docker-compose --profile dev up` → http://localhost:8080
- Prometheus:   http://localhost:9090
- Grafana:      http://localhost:4000 (admin / vv_grafana_admin)

## Development Workflow

```bash
# Daily workflow
yarn infra:up             # Start Postgres + Redis
yarn start                # Start both servers with hot reload

# Testing
yarn test                 # Run all tests
yarn test:ci              # CI mode with coverage

# Code quality
yarn lint                 # Check for lint errors
yarn lint:fix             # Auto-fix lint errors
yarn type-check           # TypeScript type checking
yarn format               # Format all files with Prettier

# Database
yarn db:migrate           # Run pending migrations
yarn db:rollback          # Rollback last migration batch
yarn db:seed              # Reload demo data

# Cleanup
yarn infra:down           # Stop infrastructure
yarn docker:down          # Stop full Docker stack
```

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable          | Description                     | Required |
|-------------------|---------------------------------|----------|
| `VV_DB_HOST`      | PostgreSQL host                 | Yes |
| `VV_DB_PASSWORD`  | PostgreSQL password             | Yes |
| `VV_REDIS_URL`    | Redis connection URL            | Yes |
| `VV_BACKEND_SECRET` | JWT signing secret (≥64 chars) | Yes |
| `STRIPE_SECRET_KEY` | Stripe API key (for payments)  | No (uses mock) |
| `SENDGRID_API_KEY`  | Email delivery                 | No (logs only) |

## Project Structure

```
Project 2/
├── packages/
│   ├── app/                    # React frontend
│   │   └── src/
│   │       ├── pages/          # Route-level page components
│   │       ├── components/     # Shared UI components
│   │       ├── hooks/          # Custom React hooks
│   │       ├── styles/         # MUI theme
│   │       └── utils/          # API client, helpers
│   └── backend/                # Express API
│       └── src/
│           ├── plugins/        # Domain plugins (catalog, orders, etc.)
│           ├── migrations/     # Knex database migrations
│           ├── seeds/          # Demo data seeders
│           ├── services/       # Database + Cache singletons
│           ├── middleware/     # Auth, rate limiting, error handling
│           └── config/         # Config loader
├── plugins/                    # Standalone marketplace plugins
├── infrastructure/
│   ├── docker/                 # Dockerfiles + docker-compose files
│   ├── kubernetes/             # K8s manifests (base + overlays)
│   ├── monitoring/             # Prometheus + Grafana configs
│   └── terraform/              # IaC for AWS resources
├── docs/                       # Documentation
└── .github/workflows/          # CI/CD pipelines
```
