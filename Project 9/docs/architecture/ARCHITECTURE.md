# MediCart Platform — Architecture Documentation

## Overview

MediCart is a cloud-native Healthcare E-Commerce SaaS platform deployed on AWS. The system follows a microservices-ready, container-first architecture with GitOps continuous delivery.

## Architecture Principles

1. **HIPAA Alignment** — encryption at rest and in transit, audit trails, access control
2. **High Availability** — Multi-AZ RDS, multi-replica pods, pod anti-affinity
3. **Auto-scaling** — HPA for pods (2–10 replicas), EKS node group (1–10 nodes)
4. **Zero-trust networking** — WAF at ingress, security groups with least-privilege
5. **GitOps** — ArgoCD ensures desired state is always reflected in the cluster
6. **Immutable infrastructure** — container images are tagged immutably; no SSH into production

## Component Architecture

### Application Layer (EKS / Kubernetes)

```
medicart namespace
├── Deployment: medicart-api (replicas: 2–10)
│   ├── Container: medicart-api (Flask/Gunicorn)
│   │   ├── /health         — liveness probe
│   │   ├── /ready          — readiness probe
│   │   └── /api/v1/*       — REST API endpoints
│   └── Resources: 100m–500m CPU, 128Mi–512Mi RAM
├── Service: medicart-api (ClusterIP :80 → :8080)
└── HPA: targetCPU=70%, targetMem=80%
```

### Networking (VPC)

```
VPC: 10.x.0.0/16 (3 AZs)
├── Public Subnets (x3)
│   ├── Internet Gateway
│   ├── NAT Gateway (EIP)
│   └── Application Load Balancer (optional)
└── Private Subnets (x3)
    ├── EKS Worker Nodes
    └── RDS PostgreSQL (Multi-AZ in prod)
```

### Data Layer (RDS)

- Engine: PostgreSQL 15
- Storage: gp3 (50 GiB dev, 100 GiB prod), encrypted AES-256
- Multi-AZ: enabled in production
- Backups: 3-day dev, 14-day prod
- Performance Insights: enabled
- CloudWatch logs: postgresql, upgrade

### CI/CD Flow

```
Developer Push
    │
    ▼
GitHub Actions
├── Job: quality
│   ├── pytest + coverage
│   └── SonarCloud analysis
├── Job: terraform-validate
│   ├── fmt check
│   ├── validate
│   └── plan (artifact uploaded)
├── Job: build-push
│   ├── docker build (docker/Dockerfile)
│   └── docker push → ECR (immutable tag: short SHA)
└── Job: deploy-dev
    ├── helm upgrade --install
    ├── kubectl rollout status
    └── smoke test (/health)

ArgoCD (parallel)
└── Watches git HEAD, syncs helm/medicart → medicart namespace
```

### Secret Management

All secrets stored in AWS Secrets Manager under namespace `medicart/{environment}/`:
- `db-credentials` — PostgreSQL username, password, endpoint, dbname, port
- `app-secrets` — JWT secret, payment gateway key, SMS/email API keys

Pods access secrets via IAM role attached to EKS node group (IRSA in production).

## Module Dependency Graph

```
terraform/main.tf
├── module.vpc          (no deps)
├── module.iam          (no deps)
├── module.s3_bucket    (no deps)
├── module.ecr          (no deps)
├── module.waf          (no deps)
├── module.eks          (depends on: vpc, iam)
├── module.rds          (depends on: vpc)
├── module.cloudwatch   (depends on: eks)
└── module.secretsmanager (depends on: rds)
```

## Security Architecture

```
Internet
    │
    ▼
AWS WAF v2
├── AWSManagedRulesCommonRuleSet
├── AWSManagedRulesKnownBadInputsRuleSet
└── Rate limit: 2,000 req / 5 min / IP
    │
    ▼
Application Load Balancer (TLS termination)
    │
    ▼
EKS Ingress (NGINX + cert-manager)
    │
    ▼
medicart-api pods (rootless, read-only FS)
    │
    ▼
RDS PostgreSQL (private subnet, SG restricts :5432)
```

## Scalability

| Metric              | Dev    | Staging | Prod     |
|---------------------|--------|---------|----------|
| EKS nodes (min/max) | 1/4    | 2/6     | 2/10     |
| API pods (HPA)      | 2/4    | 2/6     | 3/10     |
| RDS storage auto-scale | 20→40 GiB | 50→100 GiB | 100→200 GiB |
