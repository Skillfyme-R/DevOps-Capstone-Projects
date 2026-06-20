# MediCore — Platform Architecture

## System Overview

MediCore is a cloud-native, microservices-based Healthcare Technology platform. It mirrors the architectural principles of enterprise Kubernetes-native platforms: declarative resource management, operator patterns, RBAC, and extensive observability — applied to the healthcare domain with HIPAA compliance and FHIR R4 interoperability.

## Microservices Architecture

```
medicore-platform/
├── services/
│   ├── auth/           → Identity, authentication, MFA, RBAC (Port 9001)
│   ├── patients/       → FHIR Patient registry, allergies, conditions (Port 9002)
│   ├── appointments/   → Scheduling, slot management, reminders (Port 9003)
│   ├── clinical/       → EHR, clinical notes, prescriptions (Port 9004)
│   ├── analytics/      → Operational KPIs, demographics, trends (Port 9005)
│   └── notifications/  → SMS, email, push notifications (Port 9006)
├── frontend/           → React 18 SPA (Port 3005)
└── infrastructure/     → Docker, Helm, K8s, Terraform, Monitoring
```

## Technology Stack

### Frontend
- React 18 + TypeScript 5
- Material UI v5 — custom clinical teal/emerald design system
- React Query — server state with 30s stale time
- Recharts — healthcare analytics charts
- Zustand — global client state
- React Router v6 — lazy-loaded protected routes

### Backend (per service)
- Node.js 18 + TypeScript 5 + Express 4
- Knex.js 3 — SQL query builder + migrations
- PostgreSQL 15 — primary ACID-compliant database
- Redis 7 — caching, rate limiting, session management
- Joi — request schema validation
- Winston — structured JSON logging
- prom-client — Prometheus metrics exposure
- Passport.js + jsonwebtoken — JWT auth (HS256, 15-min access tokens)
- bcryptjs — password hashing (cost factor 12)

### Infrastructure
- Docker — multi-stage builds (build → Alpine runtime)
- Kubernetes 1.28 — container orchestration, HPA (3–20 replicas)
- Helm 3 — chart-based deployment management
- Kustomize — environment-specific overlays
- Terraform ≥ 1.5 — AWS VPC, EKS, RDS, ElastiCache, S3
- GitHub Actions — CI/CD pipeline
- HashiCorp Vault — secrets management

### Observability
- Prometheus — metrics with custom medicore_* metrics
- Grafana — dashboards and alerting
- Loki — log aggregation
- Jaeger — distributed tracing (OTLP)

## HIPAA Compliance Architecture

| Control | Implementation |
|---------|---------------|
| Access Control | JWT RBAC (patient/clinician/nurse/admin/superadmin) |
| Audit Logging | Immutable `mc_audit_logs` — all access recorded |
| Encryption at Rest | PostgreSQL TDE + S3 SSE-AES256 |
| Encryption in Transit | TLS 1.3 minimum (production) |
| MFA | TOTP via `otplib` |
| Data Minimisation | Role-specific query projections |
| PHI Isolation | Database subnet isolated from public subnets |
| Secrets Management | Vault + Kubernetes Secrets via `secretKeyRef` |

## FHIR R4 Resources

MediCore exposes FHIR R4-compatible endpoints at `/fhir/r4/`:
- `Patient` — complete patient demographics
- `Encounter` — clinical encounters
- `Observation` — lab values, vitals
- `MedicationRequest` — prescriptions
- `Appointment` — scheduling
- `DiagnosticReport` — lab and imaging reports

Capability statement: `GET /fhir/r4/metadata`

## Security Architecture

```
Internet → ALB (TLS) → Nginx (HSTS, CSP) → Express (Helmet.js)
                                               ↓
                              Rate Limiter (Redis) → Auth Middleware
                                               ↓
                                    Business Logic Layer
                                               ↓
                              PostgreSQL (private subnet)
```
