# NexusFinance Platform — System Architecture

## Overview

NexusFinance is an enterprise digital banking platform built on a plugin-based monorepo architecture. It provides digital banking, payment processing, loan management, and financial analytics capabilities.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         INTERNET / CDN                                │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────────────────┐
│                    AWS Application Load Balancer                       │
│              (SSL Termination · DDoS Protection · WAF)                │
└─────────────┬────────────────────────────────────┬───────────────────┘
              │ /api/*                              │ /*
┌─────────────▼──────────────┐       ┌─────────────▼──────────────────┐
│   NexusFinance Backend      │       │  NexusFinance Frontend          │
│   (Express + TypeScript)    │       │  (React 18 + Material UI)       │
│                             │       │  Served by Nginx                │
│  3–20 pods (auto-scaled)    │       │  3 pods (CDN-cached assets)     │
│  Port 7007                  │       │  Port 80                        │
└─────────────┬───────────────┘       └────────────────────────────────┘
              │
     ┌────────┴──────────────────────────┐
     │                                   │
┌────▼──────────────┐    ┌───────────────▼────────────────┐
│  PostgreSQL 15     │    │  Redis 7                        │
│  (AWS RDS)         │    │  (AWS ElastiCache Cluster)      │
│                    │    │                                 │
│  Primary + 2       │    │  Sessions · Rate Limits         │
│  Read Replicas     │    │  Cache · Pub/Sub                │
│                    │    │                                 │
│  Isolated subnet   │    │  Isolated subnet                │
│  Encrypted at rest │    │  Encrypted at rest              │
└────────────────────┘    └─────────────────────────────────┘
```

## Monorepo Structure

```
nexusfinance-platform/
├── packages/
│   ├── app/                    # React frontend
│   │   └── src/
│   │       ├── pages/          # Full page components
│   │       ├── components/     # Reusable UI components
│   │       ├── hooks/          # Custom React hooks (useAuth, useAccounts)
│   │       ├── utils/          # API client, helpers
│   │       ├── styles/         # MUI theme, global styles
│   │       └── types/          # Shared TypeScript types
│   │
│   └── backend/                # Express API server
│       └── src/
│           ├── config/         # Config loader, Knex config
│           ├── services/       # Database pool, Redis client
│           ├── middleware/     # Auth, rate limit, metrics, errors
│           ├── plugins/        # Feature modules (each is a mini-app)
│           │   ├── auth/       # JWT, OAuth, sessions
│           │   ├── accounts/   # Bank account management
│           │   ├── transactions/ # Money movements (ACID)
│           │   ├── loans/      # Loan applications + amortization
│           │   ├── payments/   # Stripe integration
│           │   ├── analytics/  # Financial insights
│           │   ├── audit/      # Compliance audit trail
│           │   └── health/     # K8s health probes
│           ├── migrations/     # Database schema changes
│           └── seeds/          # Demo data
│
├── plugins/                    # Standalone NexusFinance plugins
│   ├── nexus-accounts/         # Can be installed separately
│   ├── nexus-transactions/
│   ├── nexus-analytics/
│   ├── nexus-loans/
│   └── nexus-payments/
│
├── infrastructure/
│   ├── docker/                 # Dockerfiles + docker-compose
│   ├── kubernetes/             # K8s manifests (base + overlays)
│   ├── terraform/              # IaC for AWS (VPC, EKS, RDS, Redis)
│   └── monitoring/             # Prometheus + Grafana configs
│
└── .github/workflows/          # CI/CD pipelines
```

## Request Flow — Money Transfer

```
User clicks "Send $500" in UI
    │
    ▼
Frontend (React)
  useForm validates input
  apiClient.post('/api/v1/transactions/transfer', {...})
    │
    ▼ HTTP POST with JWT Bearer token
AWS Load Balancer
    │
    ▼
NexusFinance Backend Pod (one of 3)
  rateLimitMiddleware → check Redis (10/min for payments)
  requestIdMiddleware → attach UUID for tracing
  authMiddleware      → verify JWT, extract user
  metricsMiddleware   → start timer
    │
    ▼
transactionRoutes.transfer()
  1. Validate input (Joi schema)
  2. Check single transfer limit ($10,000 max)
  3. Verify from-account belongs to this user
  4. Verify to-account exists and is active
  5. Check sufficient funds
  6. BEGIN DATABASE TRANSACTION (atomic)
     a. Insert debit record (-$500 to Account A)
     b. Insert credit record (+$500 to Account B)
     c. Decrement Account A balance
     d. Increment Account B balance
  7. COMMIT (all 4 steps succeed) or ROLLBACK (any failure)
  8. Invalidate Redis balance cache for both accounts
  9. Record in Prometheus counter
  10. Log to audit trail
    │
    ▼
Return HTTP 201 with transaction ID and confirmation
    │
    ▼
Frontend shows success toast: "Transfer complete!"
```

## Technology Choices

| Layer         | Technology      | Why                                                    |
|---------------|-----------------|--------------------------------------------------------|
| Frontend      | React 18        | Component model, large ecosystem, hooks for state      |
| State Mgmt    | Zustand         | Lightweight, no boilerplate, persists to localStorage  |
| Data Fetching | React Query     | Caching, loading states, background refresh            |
| UI Components | Material UI     | Production-ready, accessible, customizable theme       |
| Charts        | Recharts        | Declarative, React-native, responsive                  |
| Backend       | Express + TS    | Mature, flexible, huge ecosystem                       |
| Database      | PostgreSQL      | ACID compliance, JSON support, excellent for FinTech   |
| Cache         | Redis           | Microsecond reads, TTL support, rate limiting          |
| ORM           | Knex            | SQL builder + migrations, raw SQL when needed          |
| Auth          | JWT + bcrypt    | Stateless, scalable, industry standard                 |
| Payments      | Stripe          | PCI-DSS compliant, excellent DX, webhooks              |
| Containers    | Docker + K8s    | Consistent environments, horizontal scaling            |
| CI/CD         | GitHub Actions  | Integrated with code, free for public repos            |
| IaC           | Terraform       | Declarative, state tracking, multi-cloud               |
| Monitoring    | Prometheus + Grafana | Standard in cloud-native, pull-based, powerful queries |
| APM           | Datadog         | End-to-end tracing, auto-instrumentation               |
| Errors        | Sentry          | Error grouping, stack traces, alerts                   |

## Security Architecture

### Authentication & Authorization
- JWT access tokens (15-minute lifetime)
- Refresh tokens (30-day lifetime, stored in httpOnly cookie)
- Token blacklist in Redis (for logout/revocation)
- Account lockout after 5 failed login attempts (30-minute lock)
- KYC levels gate high-risk operations

### Data Security
- All data encrypted at rest (AWS KMS)
- All connections over TLS 1.3
- PostgreSQL in isolated subnet (no internet access)
- Secrets in Kubernetes Secrets / AWS Secrets Manager (never in code)
- PII masked in logs (email shows as a***@domain.com)

### API Security
- Rate limiting per IP and per user (Redis-backed)
- CORS restricted to known origins
- Helmet.js security headers
- SQL injection impossible (Knex parameterized queries)
- Input validation with Joi on all endpoints
- CSRF protection via SameSite cookies

### Compliance
- HTTP 451 (Legal Block) for AML/sanctions hits
- Immutable audit log (append-only, never deleted)
- GDPR: soft deletes, data export endpoint
- PCI-DSS: no raw card data stored (Stripe handles it)
- SOX: all financial changes are audit-logged with user, timestamp, and before/after state
