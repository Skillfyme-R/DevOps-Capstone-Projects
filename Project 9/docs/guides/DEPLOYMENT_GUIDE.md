# MediNova Health Solutions — Deployment Guide

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Terraform | ≥ 1.6 | `terraform version` |
| AWS CLI | ≥ 2.13 | `aws --version` |
| kubectl | ≥ 1.28 | `kubectl version --client` |
| Helm | ≥ 3.12 | `helm version` |
| Docker | ≥ 24 | `docker version` |
| Python | 3.11 | `python3 --version` |

**AWS Permissions required:** IAM full access, VPC, EKS, RDS, S3, ECR, KMS, Secrets Manager, CloudWatch, WAF, DynamoDB.

---

## Step 1 — Clone and Prepare

```bash
git clone https://github.com/Skillfyme-R/DevOps-Capstone-Projects.git
cd "DevOps-Capstone-Projects/Project 9"
```

---

## Step 2 — Bootstrap Remote State (First Time Only)

This creates the S3 bucket and DynamoDB table that Terraform will use to store state.

```bash
bash scripts/deployment/bootstrap_state.sh
```

Expected output:
```
=== MediNova Terraform State Bootstrap ===
Account : 123456789012
Region  : us-east-1
Bucket  : medinova-tfstate-123456789012
Table   : medinova-state-lock
...
=== Bootstrap complete ===
Next step — update terraform/backend.tf:
  bucket = "medinova-tfstate-123456789012"
```

After bootstrap, update [terraform/backend.tf](../../terraform/backend.tf) with your actual account ID:

```hcl
bucket         = "medinova-tfstate-123456789012"   # replace with your account ID
dynamodb_table = "medinova-state-lock"
```

---

## Step 3 — Validate Terraform

```bash
bash scripts/validation/validate_terraform.sh
```

Expected: `=== All Terraform checks passed ===`

---

## Step 4 — Choose Target Environment

```bash
# Set environment variable for subsequent commands
export MEDINOVA_ENV=dev   # or: staging, prod
```

Choose your S3 bucket names (must be globally unique):

```bash
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export PATIENT_BUCKET="medinova-${MEDINOVA_ENV}-patient-records-${ACCOUNT_ID}"
export ASSETS_BUCKET="medinova-${MEDINOVA_ENV}-app-assets-${ACCOUNT_ID}"
export DB_PASSWORD="MediNova@Secure#2024!"   # use a strong password
```

---

## Step 5 — Deploy Infrastructure

```bash
cd terraform

# Initialize with remote backend
terraform init

# Preview changes
terraform plan \
  -var-file="environments/${MEDINOVA_ENV}/terraform.tfvars" \
  -var="db_master_password=${DB_PASSWORD}" \
  -var="patient_records_bucket=${PATIENT_BUCKET}" \
  -var="app_assets_bucket=${ASSETS_BUCKET}" \
  -out=medinova.tfplan

# Apply (prompts for confirmation unless -auto-approve)
terraform apply medinova.tfplan
```

Terraform will provision (in order):
1. VPC + 3-tier subnets + NAT Gateway + Flow Logs
2. KMS key + IAM roles + Security Groups + WAF v2
3. S3 buckets (patient-records + app-assets)
4. RDS PostgreSQL 15 (db subnet group + parameter group)
5. EKS cluster + node group + 4 add-ons + ECR repository
6. CloudWatch log groups + alarms + dashboard + SNS

Estimated time: **20–30 minutes** (EKS cluster creation dominates).

---

## Step 6 — Configure kubectl

```bash
aws eks update-kubeconfig \
  --name "medinova-${MEDINOVA_ENV}-cluster" \
  --region us-east-1

# Verify
kubectl get nodes
```

---

## Step 7 — Store DB Credentials in Secrets Manager

After RDS is provisioned, store credentials:

```bash
DB_ENDPOINT=$(terraform output -raw db_endpoint)

aws secretsmanager create-secret \
  --name "medinova/${MEDINOVA_ENV}/db-credentials" \
  --region us-east-1 \
  --secret-string "{
    \"host\": \"${DB_ENDPOINT}\",
    \"port\": \"5432\",
    \"dbname\": \"medinova_db\",
    \"username\": \"medinova_admin\",
    \"password\": \"${DB_PASSWORD}\"
  }"
```

---

## Step 8 — Build and Push Application Image

```bash
ECR_URL=$(cd terraform && terraform output -raw ecr_repository_url)

# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin "$ECR_URL"

# Build image
cd app
docker build -t medinova-api:1.0.0 .

# Tag and push
IMAGE_TAG="$(date +%Y%m%d)-$(git rev-parse --short HEAD)"
docker tag medinova-api:1.0.0 "${ECR_URL}:${IMAGE_TAG}"
docker push "${ECR_URL}:${IMAGE_TAG}"
```

---

## Step 9 — Deploy to EKS

```bash
cd ..   # back to project root

bash scripts/deployment/deploy.sh "${MEDINOVA_ENV}" "${IMAGE_TAG}"
```

This runs:
1. `aws eks update-kubeconfig` — refresh credentials
2. `helm upgrade --install` — deploy/upgrade Helm release
3. `kubectl rollout status` — wait for pods to be ready
4. Smoke test — verifies `/health` returns 200 inside the pod

---

## Step 10 — Verify Deployment

```bash
# List pods
kubectl get pods -n medinova

# Check logs
kubectl logs -n medinova -l app.kubernetes.io/name=medinova --tail=50

# Port-forward for local testing
kubectl port-forward -n medinova svc/medinova 8080:80

# In another terminal
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/doctors
```

---

## Upgrading the Application

```bash
# Build and push new image
IMAGE_TAG="$(date +%Y%m%d)-$(git rev-parse --short HEAD)"
docker build -t "${ECR_URL}:${IMAGE_TAG}" app/
docker push "${ECR_URL}:${IMAGE_TAG}"

# Deploy new version
bash scripts/deployment/deploy.sh "${MEDINOVA_ENV}" "${IMAGE_TAG}"
```

Helm performs a rolling update — old pods stay up until new pods pass readiness checks.

---

## Upgrading Infrastructure

```bash
# Review diff
terraform plan \
  -var-file="environments/${MEDINOVA_ENV}/terraform.tfvars" \
  -var="db_master_password=${DB_PASSWORD}" \
  -var="patient_records_bucket=${PATIENT_BUCKET}" \
  -var="app_assets_bucket=${ASSETS_BUCKET}"

# Apply
terraform apply ...
```

**Caution with RDS:** Changes to `instance_class` or `db_subnet_group_name` cause downtime. Schedule maintenance windows for production.

---

## Cleanup

```bash
# Dev / Staging only
bash scripts/cleanup/destroy.sh "${MEDINOVA_ENV}"
```

Production teardown requires manual intervention — contact the infrastructure team.

---

*Last updated: 2024 — MediNova Health Solutions*
