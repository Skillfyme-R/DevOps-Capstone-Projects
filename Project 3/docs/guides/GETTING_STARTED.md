# MediCore — Getting Started Guide

## Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 18.12.0 LTS | `node --version` |
| Yarn | 3.6.0 | `yarn --version` |
| Docker Desktop | 24.x | `docker --version` |
| Git | 2.x | `git --version` |
| kubectl (optional) | 1.28+ | `kubectl version` |
| Helm (optional) | 3.13+ | `helm version` |

## Quick Start (Automated)

```bash
git clone https://github.com/Skillfyme-R/DevOps-Capstone-Projects.git
cd "DevOps-Capstone-Projects/Project 3"
chmod +x scripts/local-setup.sh
./scripts/local-setup.sh
yarn start
```

## Manual Setup

### 1. Clone and configure environment

```bash
cd "DevOps-Capstone-Projects/Project 3"
cp .env.example .env
# Edit .env with your local values
```

### 2. Install dependencies

```bash
corepack enable
yarn install --no-immutable
```

### 3. Start infrastructure (PostgreSQL + Redis + MinIO)

```bash
yarn infra:up
# Wait 10 seconds for health checks
```

### 4. Run database migrations

```bash
yarn workspace medicore-auth db:migrate
yarn workspace medicore-patients db:migrate
yarn workspace medicore-appointments db:migrate
```

### 5. Seed demo data

```bash
yarn workspace medicore-auth db:seed
```

### 6. Start all services

```bash
yarn start
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3005 |
| Auth Service | http://localhost:9001/healthz/live |
| Patient Service | http://localhost:9002/healthz/live |
| Appointment Service | http://localhost:9003/healthz/live |
| Analytics Service | http://localhost:9005/healthz/live |
| FHIR Capability Statement | http://localhost:9002/fhir/r4/metadata |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:4001 (admin / medicore_grafana_admin) |
| Loki | http://localhost:3100 |
| Jaeger | http://localhost:16686 |
| MinIO Console | http://localhost:9001 |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@medicore.health | MediCore@2025! |
| Clinician | dr.smith@medicore.health | MediCore@2025! |
| Nurse | nurse.johnson@medicore.health | MediCore@2025! |
| Patient | patient@medicore.health | MediCore@2025! |

## Docker Compose (Full Stack)

```bash
yarn docker:up          # Start all 9 services
yarn docker:down        # Stop all services
```

## Kubernetes Deployment

```bash
# Staging
yarn k8s:deploy:staging

# Production via Helm
yarn helm:install
```
