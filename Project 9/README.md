# MediCart Healthcare Platform

**Company:** MediCart Health Technologies Pvt. Ltd.
**Product:** MediCart SaaS Platform
**Tagline:** *Your Trusted Healthcare Marketplace*
**Mission:** To democratize access to quality healthcare products through a secure, compliant, and AI-assisted digital platform that connects patients, pharmacies, hospitals, and medical suppliers.
**Vision:** To be India's most trusted Healthcare E-Commerce ecosystem — enabling every citizen to access genuine medicines, medical equipment, and clinical services from anywhere, at any time.

---

## Platform Overview

MediCart is a cloud-native Healthcare E-Commerce SaaS platform built on AWS. It provides a secure, scalable marketplace for:

- **Patients & Consumers** — Browse and order medicines, supplements, and medical devices
- **Pharmacies & Chemists** — Manage product listings, inventory, and digital prescriptions
- **Hospitals & Clinics** — Bulk procurement of medical supplies
- **Distributors & Vendors** — Supply chain management and warehouse operations

### Brand Identity

| Attribute      | Value |
|----------------|-------|
| Company        | MediCart Health Technologies Pvt. Ltd. |
| Product        | MediCart Platform |
| Domain         | medicart.health |
| Primary Color  | #006E9E (MediCart Blue) |
| Accent Color   | #00C97B (Pulse Green) |
| Background     | #F0F7FF (Cloud White) |
| Typography     | Inter (UI), Merriweather (Content) |
| Logo Concept   | Shopping cart with a medical cross integrated into the cart icon |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MediCart AWS Infrastructure                      │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                          VPC (10.x.0.0/16)                       │    │
│  │                                                                  │    │
│  │  Public Subnets          │   Private Subnets                     │    │
│  │  ┌──────────────────┐    │   ┌──────────────────────────────┐    │    │
│  │  │  Internet Gateway │    │   │  EKS Node Group               │    │    │
│  │  │  NAT Gateway      │    │   │  (medicart-api pods)          │    │    │
│  │  │  Load Balancer    │    │   │                               │    │    │
│  │  └──────────────────┘    │   │  RDS PostgreSQL (Multi-AZ)    │    │    │
│  │                           │   │  (medicartdb)                 │    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ECR ──► EKS Cluster ──► HPA (2–10 replicas) ──► CloudWatch            │
│  S3 (assets + tf state)    Secrets Manager    WAF v2                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer                | Technology |
|----------------------|------------|
| Application          | Python 3.11 / Flask 3.0 / Gunicorn |
| Containerization     | Docker (multi-stage, rootless) |
| Container Registry   | Amazon ECR (immutable tags, lifecycle policies) |
| Orchestration        | Amazon EKS 1.31 + Helm 3 |
| Infrastructure as Code | Terraform 1.9 (modular) |
| GitOps               | ArgoCD (automated sync + self-heal) |
| CI/CD                | GitHub Actions + Jenkins |
| Database             | Amazon RDS PostgreSQL 15 (gp3, encrypted, Multi-AZ in prod) |
| Object Storage       | Amazon S3 (versioned, AES-256, lifecycle) |
| Secrets              | AWS Secrets Manager |
| Monitoring           | Prometheus + Grafana (kube-prometheus-stack) |
| Logging              | CloudWatch Logs (VPC flow logs, EKS logs, app logs) |
| Security             | AWS WAF v2, IAM least-privilege, Security Groups |
| Configuration        | Node config via Ansible |
| Code Quality         | SonarCloud (80% coverage gate) |

---

## Repository Structure

```
Project 9/
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # GitHub Actions — test, build, deploy
├── ansible/
│   ├── inventory/
│   │   └── hosts.ini
│   └── playbooks/
│       └── configure-eks-nodes.yml
├── argocd/
│   └── apps/
│       └── medicart.yaml          # ArgoCD Application manifest
├── docker/
│   ├── Dockerfile                 # Multi-stage, rootless container
│   ├── requirements.txt
│   └── src/
│       ├── app.py                 # MediCart Flask REST API
│       └── tests/
│           └── test_app.py
├── environments/
│   ├── dev/terraform.tfvars
│   ├── staging/terraform.tfvars
│   └── prod/terraform.tfvars
├── helm/
│   └── medicart/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-dev.yaml
│       ├── values-prod.yaml
│       └── templates/
│           ├── _helpers.tpl
│           ├── deployment.yaml
│           ├── service.yaml
│           └── hpa.yaml
├── kubernetes/
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── modules/
│   ├── vpc/                       # VPC + subnets + NAT + flow logs
│   ├── eks/                       # EKS cluster + node group + add-ons
│   ├── rds/                       # PostgreSQL + parameter group + encryption
│   ├── ecr/                       # Container registry + lifecycle + policy
│   ├── iam/                       # Roles for EKS, nodes, CI/CD OIDC
│   ├── s3_bucket/                 # Encrypted bucket + versioning + lifecycle
│   ├── cloudwatch/                # Log groups + alarms + dashboard
│   ├── waf/                       # WAF v2 + rate limiting + managed rules
│   └── secretsmanager/            # DB credentials + app secrets
├── monitoring/
│   ├── prometheus-values.yaml
│   └── install.sh
├── scripts/
│   ├── check_infra.py             # Infrastructure health check
│   └── tests/
│       └── test_check_infra.py
├── terraform/
│   ├── backend.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── main.tf
│   └── outputs.tf
├── docs/
│   ├── architecture/
│   ├── runbooks/
│   └── api/
├── Jenkinsfile
├── sonar-project.properties
├── .coveragerc
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Platform information |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |
| GET | `/api/v1/products` | List products (filter: `?category=`, `?requires_prescription=`) |
| GET | `/api/v1/products/{id}` | Get product by ID |
| GET | `/api/v1/inventory` | Inventory summary |
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/orders/{id}` | Get order by ID |
| GET | `/api/v1/shipments/{tracking}` | Track shipment |
| GET | `/api/v1/analytics/summary` | Analytics dashboard data |
| GET | `/api/v1/prescriptions` | List prescriptions |

---

## Quick Start

### Local Development

```bash
cd docker
pip install -r requirements.txt
ENVIRONMENT=dev APP_VERSION=1.0.0 python src/app.py
# API: http://localhost:8080
```

### Run Tests

```bash
pytest docker/src/tests/ scripts/tests/ --cov=docker/src -v
```

### Docker Build & Run

```bash
docker build -t medicart-api:latest docker/
docker run -p 8080:8080 \
  -e ENVIRONMENT=dev \
  -e AWS_REGION=us-east-1 \
  medicart-api:latest
```

### Infrastructure Deployment

**Prerequisites:** AWS CLI configured, Terraform >= 1.5, kubectl, helm

```bash
# 1. Initialize Terraform (update backend.tf with your account ID first)
cd terraform
terraform init \
  -backend-config="bucket=medicart-tfstate-YOUR_ACCOUNT_ID"

# 2. Plan (dev environment)
terraform plan -var-file="../environments/dev/terraform.tfvars" \
  -var="db_password=SECURE_PASSWORD"

# 3. Apply
terraform apply -var-file="../environments/dev/terraform.tfvars" \
  -var="db_password=SECURE_PASSWORD"

# 4. Configure kubectl
aws eks update-kubeconfig --name medicart-dev-cluster --region us-east-1

# 5. Install monitoring
bash monitoring/install.sh

# 6. Deploy application (Helm)
helm upgrade --install medicart helm/medicart \
  --namespace medicart \
  --create-namespace \
  --values helm/medicart/values-dev.yaml

# 7. Verify
kubectl get pods -n medicart
bash scripts/check_infra.py
```

### ArgoCD GitOps Deployment

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Deploy MediCart application
kubectl apply -f argocd/apps/medicart.yaml
```

---

## Environments

| Environment | VPC CIDR    | EKS Nodes | RDS Instance | Region     |
|-------------|-------------|-----------|--------------|------------|
| dev         | 10.0.0.0/16 | 1–4       | db.t3.micro  | us-east-1  |
| staging     | 10.1.0.0/16 | 2–6       | db.t3.small  | us-east-1  |
| prod        | 10.2.0.0/16 | 2–10      | db.t3.medium | us-east-1  |

Production adds: Multi-AZ RDS, deletion protection, 14-day backups, WAF, enhanced monitoring.

---

## Security

- **HIPAA-aligned** — encrypted storage (AES-256), encrypted transit (TLS), audit logging
- **WAF v2** — OWASP common rules, known-bad inputs, rate limiting (2,000 req/5min per IP)
- **Secrets Manager** — no credentials in code or environment files
- **IAM least-privilege** — separate roles for EKS cluster, nodes, and CI/CD
- **VPC Flow Logs** — 90-day retention for network audit
- **Container security** — rootless (UID 1000), read-only filesystem, dropped capabilities
- **GitHub Actions OIDC** — no long-lived AWS credentials in CI/CD

---

## CI/CD Pipeline

```
Push to main
    │
    ├─► Code Quality (pytest + SonarCloud)
    │       │
    │       ├─► Terraform Validate + Plan
    │       │
    │       └─► Build & Push to ECR
    │               │
    │               └─► Deploy to EKS (Dev) via Helm
    │                       │
    │                       └─► Smoke Test (/health endpoint)
    │
    └─► [ArgoCD] Continuous GitOps sync
```

---

## Monitoring & Alerting

- **Prometheus** — metrics scraping, custom MediCart alert rules
- **Grafana** — dashboards for API latency, error rates, pod health, RDS connections
- **CloudWatch** — CPU/memory alarms, RDS connection alarms, application logs
- **Alert rules:** High error rate (>5%), High latency (p99 > 2s), Pod crash loops

Access Grafana: `https://grafana.medicart.health`

---

## Attribution

Architecturally inspired by [aws-terraform-devops](https://github.com/Liquenson/aws-terraform-devops)
by Liquenson Ruben (MIT License). All application code, business domain, branding, and
documentation are original work. See [LICENSE](LICENSE) for full attribution notice.

---

*MediCart Health Technologies Pvt. Ltd. — Building healthier lives through technology.*
