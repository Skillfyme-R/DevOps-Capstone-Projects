# CartFlow — Architecture & Design Guide

## System Overview

CartFlow Commerce Platform is a cloud-native E-Commerce SaaS application deployed on AWS EKS using a fully automated GitOps pipeline. Every change — application code, infrastructure, configuration, or access control — flows through Git and is deployed without manual intervention.

---

## Component Map

```
┌──────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                         │
│   git push → Pull Request → merge main → Pipeline fires          │
└──────────────────────────┬───────────────────────────────────────┘
                           │
         ┌─────────────────▼──────────────────┐
         │         Jenkins / GitHub Actions    │
         │  1. pytest (fail fast)              │
         │  2. docker build                    │
         │  3. push → AWS ECR                  │
         │  4. terraform apply (IaC)           │
         │  5. ansible-playbook (SSM)          │
         │  6. kubectl rollout                 │
         │  7. smoke test                      │
         └─────────────────┬──────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                        AWS us-east-1                              │
│                                                                   │
│  ┌─────────────────── VPC 10.0.0.0/16 ───────────────────────┐  │
│  │                                                             │  │
│  │  Public Subnets  10.0.101.0/24 · 10.0.102.0/24            │  │
│  │  └─ NLB (cartflow-api-service)                             │  │
│  │      └─ routes to private subnet workers                   │  │
│  │                                                             │  │
│  │  Private Subnets  10.0.1.0/24 · 10.0.2.0/24              │  │
│  │  ├─ EKS Worker Node 1  (t3.small · SSM enabled)           │  │
│  │  └─ EKS Worker Node 2  (t3.small · SSM enabled)           │  │
│  │      └─ Pods: cartflow-api ×2 (RollingUpdate)             │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────── ┘  │
│                                                                   │
│  ECR  cartflow           (KMS encrypted · scan-on-push)          │
│  KMS  alias/eks/cartflow-prod  (secrets + ECR)                   │
│  S3   cartflow-tfstate-prod    (Terraform state backend)         │
│  CloudWatch  /cartflow/nodes · /cartflow/application (90d)       │
│  CloudTrail  All API events — tamper-proof audit trail           │
└──────────────────────────────────────────────────────────────────┘
```

---

## IAM Access Pattern

```
Developer / cartflow-ci (IAM user)
        │
        └─► sts:AssumeRole ──► cartflow-eks-admin-role ──► EKS cluster
                (1-hour TTL)       (Terraform managed)
```

- No user has direct cluster credentials.
- Jenkins assumes the role per build (`jenkins-deploy-{BUILD_NUMBER}` session).
- CloudTrail logs every session with the role ARN, timestamp, and source IP.
- Role is created and managed in `terraform/main.tf` — not manually.

---

## Application API Design

The Flask API is structured around three business domains:

| Domain | Endpoints | Responsibility |
|---|---|---|
| Catalog | `GET /api/v1/products`, `GET /api/v1/products/:id` | Product browsing, filtering by category/price/stock |
| Orders | `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id` | Order creation, tax calculation, order lookup |
| Platform | `GET /`, `GET /health`, `GET /metrics/summary` | Health probes, version info, business metrics |

### Order Processing Flow

```
POST /api/v1/orders
        │
        ├─ Validate request body (customer_email, items)
        ├─ Resolve each product_id → price, stock
        ├─ Check sufficient stock for each line item
        ├─ Calculate subtotal, 8% tax, total
        ├─ Generate order_id (ORD-{hex8})
        └─ Return 201 with full order object
```

---

## Kubernetes Deployment Strategy

- **RollingUpdate** — `maxSurge: 1`, `maxUnavailable: 0` ensures zero-downtime deploys.
- **Pod Anti-Affinity** — pods spread across worker nodes for high availability.
- **Resource limits** — 500m CPU / 512Mi memory cap prevents noisy-neighbour impact.
- **Liveness probe** — `GET /health` every 10s; restarts unhealthy pods automatically.
- **Readiness probe** — `GET /health` every 5s; gates traffic until pod is ready.

---

## Ansible Node Configuration

All EKS worker nodes are Amazon Linux 2023 in private subnets. Ansible reaches them via AWS Systems Manager (SSM) — no SSH port, no bastion host, no key distribution.

```
ansible-playbook site.yml
        │
        ├─ Role: common
        │   ├─ Full system update (dnf)
        │   ├─ Base packages (git, vim, jq, curl, ...)
        │   ├─ Timezone → UTC
        │   ├─ Deploy user (cartflow-deploy)
        │   ├─ Open file limit → 65536
        │   └─ journald persistent logging
        │
        ├─ Role: security
        │   ├─ SSH hardening (no root, no password auth)
        │   ├─ firewalld (HTTPS + SSH + 6443 + 10250)
        │   │   └─ immediate: yes on every rule (keeps SSM alive)
        │   └─ dnf-automatic (security updates)
        │
        └─ Role: monitoring
            ├─ CloudWatch agent install
            ├─ Metrics: CPU, memory, disk, network (60s interval)
            └─ Log shipping: /var/log/messages, secure, audit
```

---

## Terraform Module Layout

```
terraform/
├── main.tf       VPC module · EKS module · IAM Role · KMS · ECR · CloudWatch
├── users.tf      5 IAM groups · 20 named users · group memberships · policy attachments
├── variables.tf  All input variables with defaults
└── outputs.tf    cluster_name · endpoint · ECR URL · configure_kubectl command
```

State is stored in S3 (`cartflow-tfstate-prod`) with implicit locking via S3 versioning. The backend bucket must exist before running `terraform init`.

---

## Security Controls

| Control | Implementation |
|---|---|
| No static credentials | All cluster access via `sts:AssumeRole` (1h TTL) |
| Secrets encryption | KMS `alias/eks/cartflow-prod` encrypts all Kubernetes secrets at rest |
| ECR image scanning | `scan_on_push = true` — blocks deployment of images with critical CVEs (manual gate) |
| SSH hardened | Root login disabled, password auth disabled, firewalld active |
| Zero-SSH workers | Workers in private subnets, managed via SSM only |
| IAM least privilege | 5 groups with scoped policies — no group has full admin |
| Audit trail | CloudTrail captures every AWS API call with actor, timestamp, region |
