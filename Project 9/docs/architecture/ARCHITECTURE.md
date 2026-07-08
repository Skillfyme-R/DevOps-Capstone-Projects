# MediNova Health Solutions — Architecture Document

## Overview

MediNova is a cloud-native, HIPAA-aligned Healthcare Appointment & Patient Management Platform deployed on Amazon Web Services. The architecture follows a 3-tier network model, Kubernetes-based workload orchestration, and defence-in-depth security layering.

---

## Infrastructure Architecture

```
                          ┌────────────────────────────────────┐
                          │         INTERNET / CLIENTS          │
                          └──────────────┬─────────────────────┘
                                         │ HTTPS
                          ┌──────────────▼─────────────────────┐
                          │    AWS WAF v2 (OWASP + Rate Limit) │
                          └──────────────┬─────────────────────┘
                                         │
                          ┌──────────────▼─────────────────────┐
                          │    Application Load Balancer (ALB)  │
                          │         (Public Subnet)             │
                          └──────────────┬─────────────────────┘
                                         │
    ┌────────────────────────────────────▼───────────────────────────────────────┐
    │                     VPC (10.x.0.0/16)  —  3 Availability Zones            │
    │                                                                             │
    │  ┌──────────────────────────────────────────────────────────────────────┐  │
    │  │                       Public Subnets (/24 × 3)                       │  │
    │  │   Internet Gateway ──► NAT Gateway (EIP) ──► Route to Private App   │  │
    │  └──────────────────────────────────────────────────────────────────────┘  │
    │                                                                             │
    │  ┌──────────────────────────────────────────────────────────────────────┐  │
    │  │                    Private App Subnets (/24 × 3)                     │  │
    │  │                                                                       │  │
    │  │   ┌────────────────────────────────────────────────────────────┐    │  │
    │  │   │                EKS Cluster (medinova-ENV-cluster)           │    │  │
    │  │   │                                                             │    │  │
    │  │   │  ┌──────────────────┐  ┌──────────────────┐               │    │  │
    │  │   │  │ medinova-api pod │  │ medinova-api pod │  ← HPA 2-10  │    │  │
    │  │   │  │  Flask + Gunicorn│  │  Flask + Gunicorn│               │    │  │
    │  │   │  └──────────────────┘  └──────────────────┘               │    │  │
    │  │   │                                                             │    │  │
    │  │   │  Add-ons: coredns | kube-proxy | vpc-cni | ebs-csi-driver │    │  │
    │  │   └────────────────────────────────────────────────────────────┘    │  │
    │  └──────────────────────────────────────────────────────────────────────┘  │
    │                                  │                                          │
    │                                  │ Port 5432 (SG: rds only)               │
    │                                  ▼                                          │
    │  ┌──────────────────────────────────────────────────────────────────────┐  │
    │  │               Private Database Subnets (/24 × 3) — NO INTERNET      │  │
    │  │                                                                       │  │
    │  │   ┌────────────────────────────────────┐                            │  │
    │  │   │  RDS PostgreSQL 15 (Multi-AZ prod) │                            │  │
    │  │   │  • gp3 storage, encrypted (KMS)    │                            │  │
    │  │   │  • Performance Insights: 731d prod  │                            │  │
    │  │   │  • Audit logs → CloudWatch          │                            │  │
    │  │   │  • Enhanced monitoring (60s)        │                            │  │
    │  │   └────────────────────────────────────┘                            │  │
    │  └──────────────────────────────────────────────────────────────────────┘  │
    └────────────────────────────────────────────────────────────────────────────┘

    Supporting Services (Regional):
    ┌─────────────────┐  ┌────────────────┐  ┌─────────────────────┐
    │  Amazon ECR     │  │  Amazon S3     │  │  AWS Secrets Manager│
    │  medinova/      │  │  patient-      │  │  db-credentials     │
    │  appointment-api│  │  records (PHI) │  │  app-secrets        │
    │  (IMMUTABLE)    │  │  app-assets    │  └─────────────────────┘
    └─────────────────┘  └────────────────┘
    ┌─────────────────┐  ┌────────────────┐  ┌─────────────────────┐
    │  AWS KMS        │  │  VPC Flow Logs │  │  CloudWatch         │
    │  HIPAA key      │  │  90-day        │  │  Logs + Alarms +    │
    │  rotation yearly│  │  retention     │  │  Dashboard + SNS    │
    └─────────────────┘  └────────────────┘  └─────────────────────┘
```

---

## Network Architecture — 3-Tier Subnet Design

| Tier | Purpose | Internet Route | Example CIDR (dev) |
|------|---------|---------------|---------------------|
| Public | Load Balancer, NAT Gateway | IGW | 10.10.1.0/24 – 10.10.3.0/24 |
| Private App | EKS Nodes, API pods | NAT GW (egress only) | 10.10.11.0/24 – 10.10.13.0/24 |
| Private Database | RDS | None (fully isolated) | 10.10.21.0/24 – 10.10.23.0/24 |

**Key security property:** The database tier has no route to the internet — not even via NAT. Traffic must originate from the Private App security group on port 5432 only.

---

## Module Dependency Graph

```
main.tf
  ├── module.networking       (no dependencies)
  │     Outputs: vpc_id, subnet_ids, nat_gw_id
  │
  ├── module.security         (depends on: networking)
  │     Outputs: kms_key_arn, sg_ids, iam_role_arns, waf_acl_arn
  │
  ├── module.storage          (depends on: security → kms_key_arn)
  │     Outputs: patient_records_bucket, app_assets_bucket
  │
  ├── module.database         (depends on: networking, security)
  │     Outputs: db_endpoint, db_port, db_name
  │
  ├── module.compute          (depends on: networking, security)
  │     Outputs: cluster_name, cluster_endpoint, ecr_url
  │
  └── module.monitoring       (depends on: compute, database)
        Outputs: sns_topic_arn, dashboard_url
```

---

## Application Layer

### Flask API Design

```
app/src/main.py
  │
  ├── GET /                       → platform info
  ├── GET /health                 → {"status": "healthy"}
  ├── GET /ready                  → readiness probe
  │
  ├── /api/v1/patients            → list (city, status filters)
  ├── /api/v1/patients/<id>
  │
  ├── /api/v1/doctors             → list (specialization, city filters)
  ├── /api/v1/doctors/<id>
  │
  ├── /api/v1/appointments        → list (status, type, patient_id filters)
  ├── /api/v1/appointments/<id>
  │
  ├── /api/v1/medical-records     → list (patient_id filter)
  ├── /api/v1/medical-records/<id>
  │
  └── /api/v1/analytics/summary   → 30-day aggregate metrics
```

All responses follow the envelope pattern:
```json
{
  "status": "success",
  "request_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "data": { ... }
}
```

---

## Security Architecture

### Defence-in-Depth Layers

```
Layer 1 — Edge
  AWS WAF v2
    • AWSManagedRulesCommonRuleSet
    • AWSManagedRulesKnownBadInputsRuleSet
    • Rate limit: 1000 requests / 5 minutes per IP

Layer 2 — Network
  VPC Security Groups (deny-by-default)
    • eks_cluster_sg  → egress only (control plane)
    • eks_nodes_sg    → self-ingress + from cluster SG
    • rds_sg          → port 5432 from eks_nodes_sg only

  VPC Flow Logs
    • All traffic logged to CloudWatch
    • 90-day retention for forensic analysis

Layer 3 — Identity
  IAM Roles (least privilege)
    • eks_cluster_role  → AmazonEKSClusterPolicy only
    • eks_node_role     → WorkerNode + CNI + ECR + CloudWatch
    • cicd_role         → OIDC trust (token.actions.githubusercontent.com)

  No long-lived credentials anywhere.

Layer 4 — Data Encryption
  AWS KMS (HIPAA key)
    • Automatic rotation: annual
    • Used by: RDS, S3, CloudWatch, Secrets Manager

  RDS: storage_encrypted = true (KMS-backed)
  S3: SSE-S3 (AES-256)
  Secrets: AWS Secrets Manager (never in environment variables)

Layer 5 — Application
  Container security
    • Rootless: runAsUser 1000, runAsGroup 1000
    • readOnlyRootFilesystem: true
    • capabilities.drop: ["ALL"]
    • automountServiceAccountToken: false
    • /tmp as emptyDir (only writable mount)

Layer 6 — Compliance / Audit
  Audit log retention
    • /medinova/{env}/patient-access-audit → 2555 days (7 years)
    • /medinova/{env}/application         → configured retention
  S3 patient-records lifecycle → 7-year expiry (HIPAA §164.530)
  RDS parameter group: log_connections, log_disconnections, log_statement=ddl
```

---

## CI/CD Architecture

```
GitHub Push (main branch)
    │
    ├── Job 1: test
    │     • Checkout code
    │     • Install Python dependencies
    │     • Run pytest (27 unit tests)
    │     • Upload coverage report
    │     • SonarCloud analysis + quality gate
    │
    ├── Job 2: terraform-validate  (parallel with test)
    │     • terraform fmt -check
    │     • terraform init -backend=false
    │     • terraform validate
    │     • terraform plan (dev)
    │
    ├── Job 3: build-push  (after test passes)
    │     • OIDC assume cicd_role (no static keys)
    │     • docker build + push to ECR
    │     • Tag format: YYYYMMDD-SHORTSHA (e.g., 20241215-a1b2c3d)
    │
    └── Job 4: deploy-dev  (after build-push)
          • aws eks update-kubeconfig
          • helm upgrade --install medinova
          • kubectl rollout status
          • Smoke test: curl /health
```

---

## Scalability Design

### Horizontal Pod Autoscaler

```yaml
minReplicas: 2
maxReplicas: 10
metrics:
  - CPU utilization: 70%  (scale up when average > 70%)
  - Memory: 80%           (scale up when average > 80%)
```

### Pod Anti-Affinity

Pods are spread across nodes using `preferredDuringSchedulingIgnoredDuringExecution` with `topologyKey: kubernetes.io/hostname`, preventing all replicas from landing on a single node.

### EKS Node Group

- Minimum: 1 (dev), 2 (staging/prod)
- Maximum: 4 (dev), 6 (staging), 10 (prod)
- `ignore_changes = [desired_size]` — allows cluster autoscaler to manage scaling without Terraform drift

---

## Data Classification

| Data Type | Storage | Classification | Retention |
|-----------|---------|---------------|-----------|
| Patient demographics | RDS PostgreSQL | PHI | Lifetime of record |
| Appointment records | RDS PostgreSQL | PHI | 7 years |
| Medical records | S3 patient-records | PHI | 7 years (HIPAA) |
| Audit access logs | CloudWatch | Audit | 7 years (HIPAA) |
| Application logs | CloudWatch | Internal | Configurable |
| API container images | ECR | Internal | 14d untagged, keep 20 prod |

---

## Monitoring & Alerting

### CloudWatch Alarms

| Alarm | Threshold | Action |
|-------|-----------|--------|
| api_high_error_rate | >10 errors/5min | SNS → email |
| node_cpu_high | >80% | SNS → email |
| node_memory_high | >85% | SNS → email |
| rds_cpu_high | >75% | SNS → email |
| rds_connections_high | >100 connections | SNS → email |

### CloudWatch Log Groups

| Log Group | Retention | Purpose |
|-----------|-----------|---------|
| /medinova/{env}/application | var.log_retention_days | App logs |
| /medinova/{env}/appointment-api | var.log_retention_days | API request logs |
| /medinova/{env}/patient-access-audit | 2555 days | HIPAA audit trail |

---

## Environment Comparison

| Attribute | dev | staging | prod |
|-----------|-----|---------|------|
| VPC CIDR | 10.10.0.0/16 | 10.20.0.0/16 | 10.30.0.0/16 |
| EKS instance | t3.small | t3.medium | t3.large |
| EKS min/max | 1/4 | 2/6 | 2/10 |
| DB instance | db.t3.micro | db.t3.small | db.t3.medium |
| DB storage | 20 GB | 50 GB | 100 GB |
| DB Multi-AZ | No | No | Yes |
| Backup retention | 3 days | 7 days | 14 days |
| KMS deletion window | 7 days | 7 days | 30 days |
| Deletion protection | No | No | Yes |
| Perf Insights retention | 7 days | 7 days | 731 days |

---

*MediNova Health Solutions — Architecture v1.0*
