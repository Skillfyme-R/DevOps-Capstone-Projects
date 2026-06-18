# NexusFinance — Enterprise Digital Banking Platform

> A production-grade, full-stack digital banking platform built with modern DevOps practices, cloud-native architecture, and enterprise security standards.

---

## 1. Project Overview

**NexusFinance** is a comprehensive digital banking platform that simulates a real-world financial services application. It provides a complete banking experience — account management, fund transfers, loan origination, analytics, and payments — backed by a secure REST API, PostgreSQL database, Redis cache, and a full DevOps pipeline including containerization, Kubernetes orchestration, Terraform infrastructure-as-code, CI/CD automation, and observability tooling.

| Attribute | Details |
|-----------|---------|
| **Platform Name** | NexusFinance |
| **Type** | Digital Banking / FinTech SaaS |
| **Architecture** | Monorepo, Microservice-Ready, Cloud-Native |
| **Target Users** | Retail banking customers, internal finance teams |
| **Deployment** | Docker (local), Kubernetes on AWS EKS (production) |
| **Environment** | Development, Staging, Production |

---

## 2. Business Problem

Traditional banking software is monolithic, slow to deploy, and difficult to scale. Financial institutions struggle with:

- **Slow release cycles** — manual deployments cause weeks-long release windows
- **Poor observability** — no real-time visibility into system health or transaction failures
- **Fragile infrastructure** — single points of failure with no auto-scaling capability
- **Security gaps** — weak authentication, no audit trails, exposed secrets in code
- **Poor developer experience** — no local environment parity with production

NexusFinance addresses all of these with a modern DevOps-first architecture: containerized services, automated CI/CD pipelines, infrastructure-as-code, real-time monitoring, and zero-downtime deployments.

---

## 3. Objectives

### Primary Objectives
- Deliver a fully functional digital banking experience with real-time financial data
- Implement production-grade security: JWT authentication, bcrypt hashing, rate limiting, RBAC
- Achieve zero-downtime deployments using Kubernetes rolling update strategy

### Technical Objectives
- Containerize all services using Docker with environment parity across dev/staging/prod
- Automate infrastructure provisioning using Terraform on AWS
- Build a CI/CD pipeline with automated testing, security scanning, and staged deployments
- Implement observability with Prometheus metrics, Grafana dashboards, and structured logging

### Business Objectives
- Demonstrate a platform that can handle enterprise financial workloads
- Support 9 currencies, KYC compliance, AML checks, and fraud detection
- Enable horizontal auto-scaling to handle traffic spikes without manual intervention

### Expected Outcomes
- A fully deployable banking platform with documented runbooks
- Sub-200ms API response times under normal load
- 99.9% uptime via Kubernetes health probes, HPA, and multi-AZ deployment

---

## 4. Key Features

| Feature | Description | Business Benefit |
|---------|-------------|-----------------|
| **Multi-Account Management** | Checking, Savings, Investment, Credit account types with real-time balances | Customers manage all finances in one place |
| **Fund Transfers** | Internal account-to-account transfers with instant balance updates | Replaces manual wire transfer processes |
| **Deposit & Withdrawal** | Deposit funds with descriptions; withdraw with balance validation | Core banking operation with audit trail |
| **Loan Origination** | Apply for loans, view amortization schedule, make repayments | Drives lending revenue with automated processing |
| **Payments (Stripe)** | External payments via Stripe PaymentIntent; webhook event handling | Secure card payments with PCI-compliant integration |
| **Financial Analytics** | Spending breakdown by category, monthly cash flow, net worth trends | Customer financial health visibility |
| **JWT Authentication** | Access + refresh token pair, auto-refresh on expiry | Secure, stateless authentication |
| **KYC/AML Compliance** | KYC level tracking (0–3), AML flag support, fraud scoring | Regulatory compliance built into the data model |
| **Redis Caching** | Account and session data cached; invalidated on mutations | 10x faster reads; reduced database load |
| **Soft Delete** | Accounts and users logically deleted, never hard-removed | Audit compliance, data recovery capability |
| **Rate Limiting** | Per-IP request throttling via rate-limiter-flexible | Brute-force protection on auth endpoints |
| **Auto-Scaling (HPA)** | Kubernetes HPA scales pods 3–20 based on CPU/memory/requests | Handles traffic spikes without manual intervention |
| **Zero-Downtime Deploys** | RollingUpdate with maxUnavailable=0 | No customer impact during releases |
| **Multi-Currency Support** | USD, EUR, GBP, JPY, CAD, AUD, SGD, INR, AED | Ready for international expansion |
| **Real-Time Monitoring** | Prometheus + Grafana with custom alert rules | Proactive incident detection before customer impact |

---

## 5. Architecture

### High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Browser\nReact 18 + MUI"]
    end

    subgraph Gateway["API Gateway / Load Balancer"]
        LB["AWS ALB\n(Ingress Controller)"]
    end

    subgraph App["Application Layer (EKS)"]
        FE["Frontend Service\nNginx + React"]
        BE["Backend API\nNode.js + Express\n3–20 Replicas (HPA)"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL 15\nPrimary Database"]
        RD["Redis 7\nSession & Cache"]
    end

    subgraph Integrations["External Integrations"]
        Stripe["Stripe\nPayments"]
        Sentry["Sentry\nError Tracking"]
        DD["Datadog\nAPM"]
    end

    subgraph Observability["Observability Stack"]
        Prom["Prometheus\nMetrics"]
        Graf["Grafana\nDashboards"]
        Alert["Alertmanager\nSlack + PagerDuty"]
    end

    Browser --> LB
    LB --> FE
    LB --> BE
    BE --> PG
    BE --> RD
    BE --> Stripe
    BE --> Sentry
    BE --> DD
    BE --> Prom
    Prom --> Graf
    Prom --> Alert
```

### Request Flow

```mermaid
sequenceDiagram
    participant U as Browser
    participant FE as React Frontend
    participant BE as Express Backend
    participant RD as Redis Cache
    participant PG as PostgreSQL

    U->>FE: Navigate to /accounts
    FE->>BE: GET /api/v1/accounts (JWT)
    BE->>BE: Validate JWT token
    BE->>RD: Check cache (user:accounts:<id>)
    alt Cache HIT
        RD-->>BE: Return cached accounts
    else Cache MISS
        BE->>PG: SELECT * FROM nexus_accounts
        PG-->>BE: Rows returned
        BE->>RD: Store in cache (TTL: 60s)
    end
    BE-->>FE: JSON response { accounts: [...] }
    FE-->>U: Render account cards
```

### CI/CD Pipeline Flow

```mermaid
flowchart LR
    Dev["Developer\nPush / PR"] --> GH["GitHub\nRepository"]
    GH --> Lint["Lint\nESLint"]
    Lint --> TC["Type Check\nTypeScript"]
    TC --> Test["Tests\nJest + Integration"]
    Test --> Sec["Security Scan\nyarn audit\n+ TruffleHog"]
    Sec --> Build["Docker Build\nghcr.io image"]
    Build --> Stage["Deploy Staging\nkubectl rolling update"]
    Stage --> Smoke["Smoke Tests\n/healthz/ready"]
    Smoke --> Approval["Manual Approval\nRequired"]
    Approval --> Prod["Deploy Production\nZero-downtime rollout"]
    Prod --> Release["GitHub Release\nv<run-number>"]
    Prod --> Notify["Slack Notification"]
```

---

## 6. Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| React Router | 6.15.0 | Client-side routing |
| Material UI (MUI) | 5.14.5 | Component library |
| Emotion | 11.11.1 | CSS-in-JS styling |
| React Query | 3.39.3 | Server state management, caching |
| Zustand | 4.4.1 | Client state management |
| Recharts | 2.7.3 | Financial charts (pie, bar) |
| React Hook Form | 7.45.4 | Form validation |
| Axios | 1.4.0 | HTTP client |
| date-fns | 2.30.0 | Date formatting |
| react-toastify | 9.1.3 | Toast notifications |
| TypeScript | 5.1.6 | Static typing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.12+ | Runtime |
| Express.js | 4.18.2 | HTTP framework |
| TypeScript | 5.1.6 | Static typing |
| Knex.js | 3.0.1 | SQL query builder + migrations |
| Passport.js | 0.6.0 | Authentication middleware |
| JWT (jsonwebtoken) | — | Access + refresh token auth |
| bcryptjs | 2.4.3 | Password hashing (cost factor 10) |
| Stripe SDK | 13.4.0 | Payment processing |
| Winston | 3.10.0 | Structured JSON logging |
| prom-client | 14.2.0 | Prometheus metrics exposure |
| dd-trace | 4.14.0 | Datadog APM tracing |
| Sentry | 7.65.0 | Error tracking |
| rate-limiter-flexible | 3.0.0 | API rate limiting |
| node-cron | 3.0.2 | Scheduled jobs (interest, reports) |
| Joi | — | Request body validation |
| Helmet | — | Security HTTP headers |
| Morgan | — | HTTP access logging |
| dotenv | — | Environment variable loading |

### Database & Cache

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 15-alpine | Primary relational database |
| Redis | 7-alpine | Session storage + API cache |
| Knex Migrations | — | Schema version control |
| Knex Seeds | — | Demo data seeding |

### DevOps & Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | — | Containerization |
| Docker Compose | — | Local multi-service orchestration |
| Kubernetes (EKS) | — | Production container orchestration |
| Terraform | AWS ~5.0 | Infrastructure as Code |
| GitHub Actions | — | CI/CD automation |
| Yarn Berry | 4.x (PnP) | Monorepo package management |
| Nginx | — | Frontend static file serving |

### Cloud (AWS)

| Resource | Purpose |
|----------|---------|
| EKS | Managed Kubernetes (nexusfinance-staging, nexusfinance-production) |
| VPC | Isolated network (10.0.0.0/16) with public/private/isolated subnets |
| ALB | Application Load Balancer via Kubernetes Ingress |
| RDS | Managed PostgreSQL |
| ElastiCache | Managed Redis |
| S3 | Document storage, backups |
| NAT Gateway | Outbound internet for private subnets |

### Monitoring & Observability

| Technology | Version | Purpose |
|------------|---------|---------|
| Prometheus | 2.46.0 | Metrics collection (15s scrape interval) |
| Grafana | 10.1.0 | Dashboards (backend, transactions, loans) |
| Alertmanager | — | Alert routing → Slack + PagerDuty + Email |
| Datadog | — | APM, distributed tracing |
| Sentry | — | Frontend + backend error tracking |
| Winston | 3.10.0 | Structured JSON logs |
| Morgan | — | HTTP request access logs |

---

## 7. Folder Structure

```text
Project 1/
├── packages/
│   ├── app/                        # React frontend application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── auth/           # ProtectedRoute, auth guards
│   │   │   │   └── layout/         # Sidebar, TopHeader, AppLayout
│   │   │   ├── hooks/              # useAuth, custom React hooks
│   │   │   ├── pages/              # One file per route
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   ├── AccountsPage.tsx
│   │   │   │   ├── AccountDetailPage.tsx
│   │   │   │   ├── TransactionsPage.tsx
│   │   │   │   ├── PaymentsPage.tsx
│   │   │   │   ├── LoanApplyPage.tsx
│   │   │   │   ├── AnalyticsPage.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   └── ProfilePage.tsx
│   │   │   ├── styles/             # MUI theme, NEXUS_COLORS, CHART_COLORS
│   │   │   └── utils/              # apiClient (Axios wrapper)
│   │   ├── public/
│   │   └── package.json
│   │
│   └── backend/                    # Express.js API server
│       └── src/
│           ├── index.ts            # App entry, middleware, CORS, dotenv
│           ├── plugins/            # Feature-based route modules
│           │   ├── auth/           # Login, register, refresh, /me
│           │   ├── accounts/       # CRUD + soft delete
│           │   ├── transactions/   # Transfer, deposit, withdrawal
│           │   ├── loans/          # Apply, schedule, repayment
│           │   ├── payments/       # Stripe integration + webhooks
│           │   ├── analytics/      # Spending, cashflow, net worth
│           │   ├── audit/          # Compliance event log
│           │   └── health/         # /healthz, /healthz/live, /healthz/ready
│           ├── services/
│           │   ├── database.ts     # Knex connection + table constants
│           │   └── cache.ts        # Redis client + CACHE_KEYS helpers
│           ├── middleware/
│           │   ├── errorHandler.ts # Global error middleware, custom error classes
│           │   └── auth.ts         # JWT verification middleware
│           ├── utils/
│           │   └── logger.ts       # Winston logger factory
│           ├── migrations/         # Knex schema migrations (plain .js)
│           └── seeds/              # Demo data seeder
│
├── infrastructure/
│   ├── docker/
│   │   └── docker-compose.yml      # Postgres, Redis, backend, frontend, Prometheus, Grafana
│   ├── kubernetes/
│   │   ├── deployment.yaml         # Backend deployment (3–20 replicas, HPA)
│   │   ├── service.yaml            # ClusterIP / LoadBalancer services
│   │   ├── ingress.yaml            # ALB Ingress rules
│   │   ├── hpa.yaml                # HorizontalPodAutoscaler
│   │   ├── configmap.yaml          # Non-secret environment config
│   │   └── secrets.yaml            # Kubernetes secrets
│   ├── terraform/
│   │   ├── main.tf                 # Root module
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── modules/
│   │       ├── vpc/                # VPC, subnets, IGW, NAT, route tables
│   │       ├── eks/                # EKS cluster + node groups
│   │       ├── rds/                # PostgreSQL RDS
│   │       └── elasticache/        # Redis ElastiCache
│   └── monitoring/
│       ├── prometheus.yml          # Scrape configs, retention, targets
│       ├── grafana/
│       │   └── dashboards/         # Pre-provisioned JSON dashboards
│       └── alert-rules.yml         # Critical + warning alert definitions
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint → TypeCheck → Test → Scan → Build
│       └── deploy.yml              # Deploy staging → approval → deploy production
│
├── app-config.yaml                 # App-wide configuration (currencies, limits, features)
├── .env                            # Local secrets (not committed)
├── package.json                    # Monorepo root, workspace scripts
└── README.md
```

---

## 8. Database Design

### Overview

PostgreSQL 15 is the primary data store. All tables use UUID primary keys, have `created_at` / `updated_at` timestamps, and support soft deletes via `deleted_at`. Schema changes are managed through versioned Knex migrations.

### Entity Relationship Diagram

```mermaid
erDiagram
    NEXUS_USERS {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string phone
        string country
        json roles
        int kyc_level
        string status
        int failed_login_attempts
        timestamp locked_until
        timestamp last_login_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    NEXUS_ACCOUNTS {
        uuid id PK
        uuid user_id FK
        string account_number UK
        string account_type
        decimal balance
        decimal available_balance
        string currency
        string nickname
        string status
        decimal interest_rate
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    NEXUS_TRANSACTIONS {
        uuid id PK
        uuid account_id FK
        uuid user_id FK
        string type
        decimal amount
        string description
        string status
        string currency
        uuid reference_id
        timestamp created_at
        timestamp updated_at
    }

    NEXUS_LOANS {
        uuid id PK
        uuid user_id FK
        decimal principal
        decimal interest_rate
        int term_months
        decimal monthly_payment
        decimal outstanding_balance
        string status
        timestamp created_at
        timestamp updated_at
    }

    NEXUS_PAYMENT_METHODS {
        uuid id PK
        uuid user_id FK
        string provider
        string provider_id
        string type
        string last4
        boolean is_default
        timestamp created_at
    }

    NEXUS_AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        json metadata
        timestamp created_at
    }

    NEXUS_USERS ||--o{ NEXUS_ACCOUNTS : owns
    NEXUS_USERS ||--o{ NEXUS_LOANS : applies
    NEXUS_USERS ||--o{ NEXUS_PAYMENT_METHODS : has
    NEXUS_USERS ||--o{ NEXUS_AUDIT_LOG : generates
    NEXUS_ACCOUNTS ||--o{ NEXUS_TRANSACTIONS : records
```

### Tables

| Table | Purpose |
|-------|---------|
| `nexus_users` | Core user identity, KYC level, login security, RBAC roles |
| `nexus_accounts` | Bank accounts (checking/savings/investment/credit) with soft delete |
| `nexus_transactions` | All money movements: deposits, withdrawals, transfers |
| `nexus_loans` | Loan applications, repayment tracking, amortization |
| `nexus_payment_methods` | Stripe payment methods, default card selection |
| `nexus_audit_log` | Immutable compliance audit trail for all financial actions |

### Indexing Strategy

| Table | Index | Reason |
|-------|-------|--------|
| `nexus_users` | `email` (unique) | Login lookup |
| `nexus_users` | `status`, `created_at` | Admin queries, pagination |
| `nexus_accounts` | `user_id`, `deleted_at` | Per-user account listing |
| `nexus_transactions` | `account_id`, `created_at DESC` | Transaction history pagination |
| `nexus_loans` | `user_id`, `status` | Active loan queries |

### Database Optimizations
- Auto-updated `updated_at` via PostgreSQL trigger (`update_nexus_users_updated_at`)
- Soft deletes prevent data loss while keeping queries clean via `whereNull('deleted_at')`
- Redis caching layer sits in front of all read-heavy endpoints (accounts list, analytics)
- Connection pooling managed by Knex with configurable min/max pool size

---

## 9. API Documentation

### Overview

All API endpoints are prefixed with `/api/v1/`. Authenticated endpoints require a Bearer JWT token in the `Authorization` header.

### Authentication

```
Authorization: Bearer <access_token>
```

Tokens expire after a short window. Use `POST /api/v1/auth/refresh` with the refresh token to obtain a new access token.

### Endpoints

#### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | No | Register new user |
| `POST` | `/api/v1/auth/login` | No | Login → returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | No | Refresh access token |
| `POST` | `/api/v1/auth/logout` | Yes | Revoke tokens |
| `POST` | `/api/v1/auth/forgot-password` | No | Send reset email |
| `POST` | `/api/v1/auth/reset-password` | No | Set new password via reset token |
| `GET`  | `/api/v1/auth/me` | Yes | Get current user profile |

#### Accounts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`    | `/api/v1/accounts` | Yes | List all user accounts |
| `GET`    | `/api/v1/accounts/:id` | Yes | Single account detail |
| `POST`   | `/api/v1/accounts` | Yes | Open new account |
| `PATCH`  | `/api/v1/accounts/:id` | Yes | Update nickname/settings |
| `DELETE` | `/api/v1/accounts/:id` | Yes | Close account (soft delete, requires $0 balance) |
| `GET`    | `/api/v1/accounts/:id/statement` | Yes | Monthly statement PDF |

#### Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/v1/transactions` | Yes | List transactions (filterable, paginated) |
| `GET`  | `/api/v1/transactions/:id` | Yes | Single transaction detail |
| `POST` | `/api/v1/transactions/transfer` | Yes | Transfer between accounts |
| `POST` | `/api/v1/transactions/deposit` | Yes | Deposit funds |
| `POST` | `/api/v1/transactions/withdrawal` | Yes | Withdraw funds |

#### Loans

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/v1/loans` | Yes | List user loans |
| `GET`  | `/api/v1/loans/:id` | Yes | Loan detail + repayment schedule |
| `POST` | `/api/v1/loans/apply` | Yes | Submit loan application |
| `GET`  | `/api/v1/loans/:id/schedule` | Yes | Full amortization schedule |
| `POST` | `/api/v1/loans/:id/payment` | Yes | Make a repayment |

#### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST`   | `/api/v1/payments/initiate` | Yes | Create Stripe PaymentIntent |
| `POST`   | `/api/v1/payments/webhook` | No | Receive Stripe webhook events |
| `GET`    | `/api/v1/payments/methods` | Yes | List saved payment methods |
| `POST`   | `/api/v1/payments/methods` | Yes | Add payment method |
| `DELETE` | `/api/v1/payments/methods/:id` | Yes | Remove payment method |

#### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/analytics/summary` | Yes | Net worth, total assets, liabilities |
| `GET` | `/api/v1/analytics/spending` | Yes | Spending by category with percentages |
| `GET` | `/api/v1/analytics/cashflow` | Yes | Monthly income vs expenses |
| `GET` | `/api/v1/analytics/net-worth-history` | Yes | Net worth trend over time |

#### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/healthz` | No | Overall health (DB + Redis status) |
| `GET` | `/healthz/live` | No | Liveness probe |
| `GET` | `/healthz/ready` | No | Readiness probe |
| `GET` | `/metrics` | No | Prometheus metrics scrape endpoint |

### Request Example — Login

```bash
curl -X POST http://localhost:7007/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alex.johnson@demo.nexusfinance.io", "password": "password123"}'
```

### Response Example — Login

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "email": "alex.johnson@demo.nexusfinance.io",
    "firstName": "Alex",
    "lastName": "Johnson",
    "roles": ["customer"],
    "kycLevel": 2
  }
}
```

### Error Handling

All errors follow a consistent envelope:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Account not found",
    "statusCode": 404,
    "requestId": "389559da-de18-435a-8973-2d0a80ed001b"
  }
}
```

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body or params |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g. email already registered) |
| 422 | `BUSINESS_RULE_ERROR` | Business rule violation (e.g. insufficient balance) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 10. Security Implementation

### Authentication & Authorization
- **JWT Access + Refresh Tokens** — short-lived access tokens with longer-lived refresh tokens stored securely
- **bcryptjs** — passwords hashed with cost factor 10 (≈100ms per hash, brute-force resistant)
- **RBAC** — roles stored as JSON array on user record (`["customer"]`, `["admin"]`)
- **Passport.js** — extensible auth strategy layer; supports Google, GitHub, Microsoft OAuth

### API Security
- **Helmet.js** — sets 11 security HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — explicit allow-list of origins (localhost:3002, production domain)
- **Rate Limiting** — per-IP throttling on all endpoints, stricter limits on `/auth/login`
- **Request Validation** — Joi schema validation on all POST/PATCH bodies; invalid input returns 400

### Account Security
- **Login lockout** — `failed_login_attempts` counter; account locked via `locked_until` timestamp
- **Soft delete** — users and accounts never hard-deleted; `deleted_at` timestamp preserves audit trail
- **KYC levels** — 0 (unverified) to 3 (fully verified); higher levels unlock higher transaction limits

### Transaction Limits

| Limit Type | Value |
|------------|-------|
| Single transaction | $10,000 |
| Daily | $50,000 |
| Weekly | $200,000 |
| Monthly | $500,000 |

### Secrets Management
- All credentials stored in `.env` (never committed to git)
- Kubernetes Secrets for production (base64-encoded, RBAC-controlled)
- TruffleHog secret scanning runs in every CI pipeline execution

### Compliance
- **KYC tracking** — `kyc_level` field on every user record
- **AML** — AML flag support in data model
- **Fraud scoring** — `fraud_score` field enabled in app-config
- **Audit log** — `nexus_audit_log` table records every financial action immutably

---

## 11. CI/CD Pipeline

### Pipeline Overview

```mermaid
flowchart TB
    subgraph CI["CI — Runs on every PR and push to main"]
        L["1. Lint\nESLint (max-warnings: 0)"]
        T["2. Type Check\ntsc --noEmit"]
        UT["3. Unit + Integration Tests\nJest + real PostgreSQL + Redis"]
        S["4. Security Scan\nyarn audit + TruffleHog"]
        B["5. Docker Build\nBackend + Frontend images\nTagged: sha-commit"]
        P["6. Push to Registry\nghcr.io"]
    end

    subgraph CD_Stage["CD Staging — Auto-deploy on main merge"]
        MS["Run DB Migrations"]
        DS["kubectl set image\n(rolling update)"]
        WS["Wait for rollout\n(300s timeout)"]
        SS["Smoke Test\nGET /healthz/ready"]
        NS["Slack Notify"]
    end

    subgraph CD_Prod["CD Production — Requires manual approval gate"]
        MP["Run DB Migrations"]
        DP["kubectl rolling update\n(maxUnavailable=0)"]
        WP["Wait for rollout"]
        SP["Smoke Test"]
        RB["Auto Rollback\non smoke failure"]
        GR["GitHub Release\nv run-number"]
        NP["Slack Notify"]
    end

    L --> T --> UT --> S --> B --> P
    P --> MS --> DS --> WS --> SS --> NS
    NS --> Approval["Manual Approval Gate"]
    Approval --> MP --> DP --> WP --> SP
    SP --> RB
    SP --> GR --> NP
```

### Key Pipeline Design Decisions

| Decision | Rationale |
|----------|-----------|
| Integration tests against real DB | Mock databases can mask migration failures; a real DB catches schema bugs |
| TruffleHog in CI | Prevents secrets from ever reaching the container registry |
| Manual approval gate to production | High-stakes financial data — no unreviewed code reaches production automatically |
| Auto-rollback on smoke failure | Mean time to recovery under 5 minutes when a bad deploy is caught |
| Image tagged with `sha-<commit>` | Exact traceability from a running production pod back to its source commit |

---

## 12. Deployment Architecture

### AWS Infrastructure

```mermaid
flowchart TB
    subgraph Internet
        Users["End Users"]
        Stripe["Stripe API"]
    end

    subgraph AWS["AWS — us-east-1"]
        subgraph Public["Public Subnets (3 AZs)"]
            ALB["Application\nLoad Balancer"]
            NAT["NAT Gateway"]
        end

        subgraph Private["Private Subnets (3 AZs)"]
            subgraph EKS["EKS Cluster"]
                subgraph Pods["Backend Pods (3 to 20)"]
                    P1["Pod 1"]
                    P2["Pod 2"]
                    P3["Pod 3+"]
                end
                HPA["HPA\nCPU > 70%\nMemory > 80%"]
            end
        end

        subgraph Isolated["Isolated Subnets (3 AZs — no internet route)"]
            RDS["RDS PostgreSQL\nMulti-AZ"]
            EC["ElastiCache Redis\nCluster Mode"]
        end

        S3["S3\nDocuments + Backups"]
    end

    Users --> ALB
    ALB --> Pods
    Pods --> RDS
    Pods --> EC
    Pods --> Stripe
    Pods --> S3
    Pods --> NAT
    NAT --> Internet
    HPA -.->|scales| Pods
```

### Kubernetes Resource Summary

| Resource | Configuration |
|----------|--------------|
| Deployment replicas | Min: 3, Max: 20 (HPA-controlled) |
| Update strategy | RollingUpdate (maxSurge: 1, maxUnavailable: 0) |
| CPU request / limit | 250m / 1000m |
| Memory request / limit | 512Mi / 1Gi |
| Liveness probe | HTTP GET /healthz/live (30s delay, 15s interval) |
| Readiness probe | HTTP GET /healthz/ready (10s delay) |
| Startup probe | 30 retries × 10s = 5 min maximum startup window |
| Pod security | runAsNonRoot: true, runAsUser: 1001 |
| Topology spread | Spread across 3 AZs to eliminate zone single point of failure |

### Terraform VPC Layout

| Subnet Type | CIDR Range | Purpose |
|-------------|------------|---------|
| Public (×3) | 10.0.1–3.0/24 | ALB, NAT Gateway |
| Private (×3) | 10.0.10–12.0/24 | EKS worker nodes |
| Isolated (×3) | 10.0.20–22.0/24 | RDS, ElastiCache (no internet route) |

---

## 13. Monitoring & Logging

### Metrics Collection

Prometheus scrapes the backend at `/metrics` every 15 seconds with a 30-day retention window.

| Scrape Target | Port | Metrics Collected |
|---------------|------|-------------------|
| NexusFinance Backend | 7007 | HTTP latency, error rates, active connections |
| PostgreSQL Exporter | 9187 | DB connections, query times, table sizes |
| Redis Exporter | 9121 | Memory usage, hit/miss ratio, command counts |
| Kubernetes Pods | Auto-discovery | CPU, memory, restart counts |

### Alert Rules

| Severity | Alert | Trigger Condition |
|----------|-------|-------------------|
| Critical | `BackendDown` | Backend unreachable for > 1 minute |
| Critical | `HighErrorRate` | 5xx error rate > 5% |
| Critical | `PaymentAPISlowdown` | P95 latency > 5 seconds |
| Critical | `HighFraudAlertRate` | > 10 fraud alerts per second |
| Warning | `HighAPILatency` | P95 latency > 2 seconds |
| Warning | `HighMemoryUsage` | Pod memory > 90% |
| Warning | `DatabaseConnectionPoolExhausted` | Active connections > 40 |
| Warning | `RedisMemoryHigh` | Redis memory > 85% |
| Warning | `TransactionVolumeDrop` | 50% below the 24-hour baseline |

### Alert Routing
- **Critical** → PagerDuty (immediate on-call page) + Slack `#alerts-critical`
- **Warning** → Slack `#alerts-warning`
- **Resolved** → Slack notification with resolution timestamp

### Logging Strategy

| Aspect | Implementation |
|--------|---------------|
| Format | Structured JSON (Winston) |
| Standard fields | `service`, `env`, `version`, `requestId` on every line |
| Trace correlation | Datadog `dd.trace_id` + `dd.span_id` embedded in every log entry |
| Error tracking | Sentry captures stack traces, user context, and environment tag |
| HTTP access log | Morgan logs every request with method, path, status, response time |

---

## 14. Installation & Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18.x | Runtime (via nvm recommended) |
| Yarn | 4.x | Package manager |
| Docker | Latest | Run Postgres + Redis locally |
| Docker Compose | Latest | Multi-container local setup |
| nvm | Latest | Node version management |

### Clone Repository

```bash
git clone <repository-url>
cd "Project 1"
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://nexus_user:nexus_dev_password@localhost:5432/nexusfinance_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexusfinance_dev
DB_USER=nexus_user
DB_PASSWORD=nexus_dev_password

# Redis
REDIS_URL=redis://localhost:6380

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=7007
NODE_ENV=development
CORS_ORIGIN=http://localhost:3002

# Stripe (optional for local)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Installation & Run

**Terminal 1 — Start infrastructure (Postgres + Redis):**
```bash
source "$HOME/.nvm/nvm.sh" && nvm use 18
cd "Project 1"
yarn infra:up
```

**Terminal 2 — Install dependencies, run migrations, seed data, start app:**
```bash
source "$HOME/.nvm/nvm.sh" && nvm use 18
cd "Project 1"
yarn install
yarn db:migrate
yarn db:seed
yarn start
```

### Access Points

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3002 | React app |
| Backend API | http://localhost:7007 | Express REST API |
| Health Check | http://localhost:7007/healthz | DB + Redis status |
| Metrics | http://localhost:7007/metrics | Prometheus scrape |
| Adminer (DB UI) | http://localhost:8080 | `nexus_user` / `nexus_dev_password` |
| Grafana | http://localhost:4000 | `admin` / `nexus_grafana_admin` |
| Prometheus | http://localhost:9090 | Raw metrics explorer |

### Demo Login Credentials

```
Email:    alex.johnson@demo.nexusfinance.io
Password: password123
```

### Verification Steps

```bash
# 1. Health check — should return { status: "ok" }
curl http://localhost:7007/healthz

# 2. Login test — should return accessToken + user object
curl -X POST http://localhost:7007/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex.johnson@demo.nexusfinance.io","password":"password123"}'

# 3. Readiness probe
curl http://localhost:7007/healthz/ready
```

---

## 16. Challenges & Learnings

### Technical Challenges

| Challenge | Root Cause | Solution Applied |
|-----------|-----------|-----------------|
| Yarn Berry PnP module resolution | PnP does not use `node_modules` — some tools fail silently | Configured `.yarnrc.yml`; verified PnP compatibility for every tool |
| Knex migrations failing with TypeScript | `ts-node` not registered at runtime; Knex executes files as plain JS | Rewrote all migration files as plain `.js` |
| CORS blocking frontend requests | Port 3002 not in Express allow-list | Added explicit origin allow-list to CORS middleware |
| Redis port conflict on local machine | Local Redis on 6379 clashed with Docker Redis container | Mapped Docker Redis to host port 6380 |
| API returning snake_case, frontend expecting camelCase | Database columns snake_case; TypeScript interfaces camelCase | Explicit field mapping in `/auth/me` route response |
| React Query serving stale data after mutations | Default `staleTime` too high; cached data shown after create/delete | Set `staleTime: 0` globally; used `removeQueries` after destructive operations |
| Recharts pie chart rendering empty | API returns numeric amounts as strings; Recharts requires numbers | Added `parseFloat()` mapping before passing data to chart components |
| Future dates in seeded transaction data | Random day 1–28 generated without bounding to current month | Capped max day to `today.getDate()` when `monthOffset === 0` |
| Account detail page showing wrong account | React Query served cached data from previously viewed account | Set `cacheTime: 0, staleTime: 0` on per-account queries keyed by ID |
| Backend not loading environment variables | `dotenv.config()` called after module imports that needed env vars | Moved `dotenv.config()` to the very first line of `index.ts` before all imports |

### Architecture Challenges
- **Monorepo with Yarn Berry PnP** required careful workspace configuration to share TypeScript types between frontend and backend packages without duplicating definitions
- **Cache invalidation design** — mapping which React Query keys must be invalidated after each mutation (deposit, transfer, account close) required tracing the full data dependency graph across pages

### Key Learnings

1. **Integration tests beat mocks** — mocked database tests passed while a real migration broke in production; always test against a real database instance
2. **Cache invalidation is non-trivial in financial apps** — every mutation must identify and invalidate all dependent cache keys, or users see stale balances and transaction lists
3. **Import order matters with dotenv** — Node.js caches modules on first import; `dotenv.config()` must run before any module that reads `process.env`
4. **YAML is whitespace-sensitive** — a missing space after a colon (`webhookSecret:${VAR}`) causes a silent parse failure; always validate config files with a YAML linter
5. **Structured logging pays dividends immediately** — embedding `requestId` and `trace_id` in every log line reduced mean time to diagnose cross-service issues from hours to minutes
6. **Health probes are not optional** — without accurate readiness probes, Kubernetes routes live traffic to pods still initializing, causing cascading failures during rolling deploys

---

## 17. Future Enhancements

| Enhancement | Description | Business Impact |
|-------------|-------------|-----------------|
| **2FA / MFA** | TOTP-based two-factor authentication (Google Authenticator) | Significantly reduces account takeover risk |
| **Real-Time Notifications** | WebSocket push for transactions, balance changes, and alerts | Customers get instant visibility into account activity |
| **AI Spending Insights** | ML model to categorize transactions and flag unusual spending patterns | Proactive financial health advice drives engagement and retention |
| **Mobile App** | React Native sharing the same backend API | Reach mobile-first banking customers without duplicating business logic |
| **Open Banking / Plaid** | Connect external bank accounts via Plaid API | Complete financial picture across all institutions a customer holds |
| **Scheduled Payments** | Recurring transfer automation via node-cron | Automates bill payments and savings contributions |
| **Statement PDF Export** | Downloadable PDF account statements with branded formatting | Replaces manual bank statement requests |
| **Multi-tenant / White-label** | Data isolation per organization; custom branding per tenant | Platform-as-a-service revenue model for B2B clients |
| **Service Mesh (Istio)** | mTLS between services, traffic shaping, circuit breaking | Zero-trust networking and fine-grained traffic control |
| **Event Sourcing (Kafka)** | Event bus for transaction events and audit replay | Full audit replay capability; real-time downstream consumers |
| **GraphQL Gateway** | GraphQL API layer over existing REST services | Flexible client queries; eliminates over-fetching on mobile |
| **Biometric Auth (WebAuthn)** | FIDO2 fingerprint and face login | Passwordless authentication for mobile and desktop users |

---

## License

This project is developed and maintained by **Learnsyte Learning Private Limited (Skillfyme)**.

All rights reserved. Unauthorized copying, distribution, or modification of this project without explicit written permission from Learnsyte Learning Private Limited is prohibited.

---

*Built with enterprise DevOps practices — containerization, infrastructure-as-code, CI/CD automation, and production-grade observability.*
