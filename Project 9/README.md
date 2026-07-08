# MediNova Health Solutions

**Platform:** Healthcare Appointment & Patient Management
**Company:** MediNova Health Solutions
**Tagline:** *Smarter Healthcare, Closer to You*
**Domain:** medinova.health
**Cloud:** AWS (HIPAA-eligible region: us-east-1)

---

## Mission

To make quality healthcare accessible for every citizen by connecting patients with the right doctors instantly — through a secure, compliant, cloud-native platform.

## Vision

To be the most trusted digital health platform in India, enabling frictionless appointment booking, telemedicine, patient record management, and clinical workflows for hospitals, clinics, and individual practitioners.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      MediNova AWS Infrastructure (us-east-1)                  │
│                                                                                │
│  ┌──────────────── VPC (10.x.0.0/16) — 3 Availability Zones ───────────────┐ │
│  │                                                                            │ │
│  │  ┌─────────────────────┐   ┌─────────────────────────────────────────┐   │ │
│  │  │   Public Subnets     │   │         Private App Subnets             │   │ │
│  │  │  • Internet Gateway  │   │  • EKS Worker Nodes (t3.medium/large)  │   │ │
│  │  │  • NAT Gateway (EIP) │   │  • medinova-api pods (2-10 replicas)   │   │ │
│  │  │  • Load Balancer     │   │  • HPA: CPU 70% / Memory 80%           │   │ │
│  │  └─────────────────────┘   └─────────────────────────────────────────┘   │ │
│  │                                                                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐    │ │
│  │  │                  Private Database Subnets (Isolated)              │    │ │
│  │  │  • RDS PostgreSQL 15 (Multi-AZ in prod)                          │    │ │
│  │  │  • Encrypted (AES-256) • Performance Insights • Audit Logs       │    │ │
│  │  └──────────────────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ECR (medinova/appointment-api)   S3 (patient-records + app-assets)           │
│  KMS (HIPAA key rotation)         Secrets Manager (db + app secrets)          │
│  WAF v2 (OWASP + rate limit)      CloudWatch (logs + alarms + dashboard)      │
│  VPC Flow Logs (90-day audit)     SNS (ops alerts → email)                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Project 9/
├── terraform/                     # Root Terraform configuration
│   ├── providers.tf               # AWS provider + default tags
│   ├── backend.tf                 # S3 remote state + DynamoDB lock
│   ├── variables.tf               # All input variables with validation
│   ├── locals.tf                  # Computed locals (name prefix, flags)
│   ├── main.tf                    # Module orchestration
│   ├── outputs.tf                 # Infrastructure outputs
│   └── environments/
│       ├── dev/terraform.tfvars
│       ├── staging/terraform.tfvars
│       └── prod/terraform.tfvars
│
├── modules/                       # Reusable Terraform modules
│   ├── networking/                # VPC, 3-tier subnets, NAT, flow logs
│   ├── security/                  # IAM, KMS, security groups, WAF v2
│   ├── compute/                   # EKS cluster, node group, ECR, add-ons
│   ├── database/                  # RDS PostgreSQL 15, parameter group
│   ├── storage/                   # S3 buckets (PHI + assets)
│   └── monitoring/                # CloudWatch, SNS, alarms, dashboard
│
├── app/                           # Healthcare appointment API
│   ├── src/main.py                # Flask REST API (patients, doctors, appointments)
│   ├── Dockerfile                 # Rootless container, Gunicorn
│   ├── requirements.txt
│   └── tests/unit/test_api.py     # 29 unit tests
│
├── helm/medinova/                 # Helm chart for Kubernetes deployment
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── hpa.yaml
│       └── _helpers.tpl
│
├── kubernetes/base/               # Raw Kubernetes manifests
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
│
├── scripts/
│   ├── validation/validate_terraform.sh
│   ├── deployment/bootstrap_state.sh
│   ├── deployment/deploy.sh
│   └── cleanup/destroy.sh
│
├── docs/
│   ├── architecture/ARCHITECTURE.md
│   ├── guides/DEPLOYMENT_GUIDE.md
│   └── runbooks/OPERATIONS_RUNBOOK.md
│
├── .github/workflows/
│   └── medinova-cicd.yml          # GitHub Actions CI/CD
├── Jenkinsfile                    # Jenkins pipeline
├── sonar-project.properties
├── .gitignore
└── LICENSE
```

---

## Technology Stack

| Layer            | Technology |
|------------------|------------|
| Application      | Python 3.11 / Flask 3.0 / Gunicorn |
| Container        | Docker (rootless, read-only FS) |
| Registry         | Amazon ECR (immutable tags) |
| Orchestration    | Amazon EKS 1.31 + Helm 3 |
| IaC              | Terraform 1.6+ (6 modules) |
| Database         | RDS PostgreSQL 15 (gp3, encrypted, Multi-AZ in prod) |
| Storage          | Amazon S3 (versioned, AES-256, HIPAA 7-year retention) |
| Security         | KMS, WAF v2, Secrets Manager, VPC Flow Logs |
| Monitoring       | CloudWatch Logs + Alarms + Dashboard + SNS |
| CI/CD            | GitHub Actions (OIDC) + Jenkins |
| Code Quality     | SonarCloud |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Platform info |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |
| GET | `/api/v1/patients` | List patients (filter: `?city=`, `?status=`) |
| GET | `/api/v1/patients/{id}` | Get patient by ID |
| GET | `/api/v1/doctors` | List doctors (filter: `?specialization=`, `?city=`) |
| GET | `/api/v1/doctors/{id}` | Get doctor by ID |
| GET | `/api/v1/appointments` | List appointments (filter: `?status=`, `?type=`, `?patient_id=`) |
| GET | `/api/v1/appointments/{id}` | Get appointment by ID |
| GET | `/api/v1/medical-records` | List medical records (filter: `?patient_id=`) |
| GET | `/api/v1/medical-records/{id}` | Get medical record |
| GET | `/api/v1/analytics/summary` | 30-day analytics summary |

---

## Quick Start — Local Development

```bash
# 1. Install dependencies
cd "Project 9/app"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Run the API
ENVIRONMENT=dev APP_VERSION=1.0.0 python src/main.py

# 3. Test endpoints (new terminal)
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/patients
curl http://localhost:8080/api/v1/doctors?specialization=Cardiology
curl http://localhost:8080/api/v1/appointments?type=telemedicine

# 4. Run tests
pytest tests/unit/ -v --cov=src
```

---

## Infrastructure Deployment

```bash
# 1. Bootstrap remote state (first time only)
bash scripts/deployment/bootstrap_state.sh

# 2. Update backend.tf with your account ID
# 3. Validate Terraform
bash scripts/validation/validate_terraform.sh

# 4. Deploy dev infrastructure
cd terraform
terraform init
terraform plan -var-file="environments/dev/terraform.tfvars" \
  -var="db_master_password=SECURE_PASSWORD" \
  -var="patient_records_bucket=medinova-dev-patient-records-ACCOUNT_ID" \
  -var="app_assets_bucket=medinova-dev-app-assets-ACCOUNT_ID"
terraform apply ...

# 5. Configure kubectl
aws eks update-kubeconfig --name medinova-dev-cluster --region us-east-1

# 6. Deploy application
bash scripts/deployment/deploy.sh dev 1.0.0
```

---

## Environments

| Environment | VPC CIDR      | EKS Nodes | DB Instance   | Multi-AZ | Backup |
|-------------|---------------|-----------|---------------|----------|--------|
| dev         | 10.10.0.0/16  | 1–4       | db.t3.micro   | No       | 3 days |
| staging     | 10.20.0.0/16  | 2–6       | db.t3.small   | No       | 7 days |
| prod        | 10.30.0.0/16  | 2–10      | db.t3.medium  | Yes      | 14 days|

---

## Security & Compliance

- **HIPAA-aligned** — encrypted at rest (AES-256 + KMS), encrypted in transit (TLS)
- **PHI data classification** — patient records tagged `DataClass=PHI`
- **7-year audit retention** — CloudWatch patient access logs, S3 PHI lifecycle
- **WAF v2** — OWASP common rules + known-bad inputs + rate limiting (1000 req/5min)
- **KMS key rotation** — automatic annual rotation
- **VPC Flow Logs** — 90-day retention for network forensics
- **Container security** — rootless (UID 1000), read-only FS, no capabilities
- **GitHub Actions OIDC** — no long-lived AWS credentials in CI/CD secrets

---

## CI/CD Pipeline Flow

```
Push to main
   │
   ├─► Test (pytest + SonarCloud quality gate)
   │
   ├─► Terraform Validate (fmt + validate + plan)
   │
   └─► Build & Push to ECR (immutable tag: YYYYMMDD-SHA)
           │
           └─► Deploy to EKS via Helm
                   │
                   └─► Smoke test (/health)
```

---

## Cleanup

```bash
# Dev / Staging only
bash scripts/cleanup/destroy.sh dev
```

---

*MediNova Health Solutions — Built on AWS. Designed for Healthcare.*
