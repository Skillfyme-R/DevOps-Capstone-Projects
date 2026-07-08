# MediCart Platform — Deployment Runbook

## Pre-Deployment Checklist

- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] Terraform >= 1.5.0 installed
- [ ] kubectl configured for target cluster
- [ ] Helm 3.x installed
- [ ] `db_password` stored in AWS Secrets Manager (production)
- [ ] ECR repository exists (`medicart-api`)
- [ ] SonarCloud quality gate passing

---

## Deployment Procedures

### 1. Bootstrap Remote State (first time only)

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket medicart-tfstate-$(aws sts get-caller-identity --query Account --output text) \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket medicart-tfstate-ACCOUNT_ID \
  --versioning-configuration Status=Enabled

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name medicart-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Deploy Infrastructure (Terraform)

```bash
cd terraform

# Update backend.tf with actual account ID
terraform init

# Dev
terraform workspace new dev || terraform workspace select dev
terraform plan -var-file="../environments/dev/terraform.tfvars" \
  -var="db_password=$(aws secretsmanager get-secret-value \
    --secret-id medicart/dev/db-credentials --query SecretString \
    --output text | jq -r .password)"
terraform apply ...

# Production (requires explicit approval)
terraform workspace select prod
terraform plan -var-file="../environments/prod/terraform.tfvars" \
  -var="db_password=CHANGE_ME_USE_SECRETS_MANAGER"
```

### 3. Configure kubectl

```bash
aws eks update-kubeconfig \
  --name medicart-dev-cluster \
  --region us-east-1
kubectl get nodes
```

### 4. Deploy Monitoring Stack

```bash
bash monitoring/install.sh
```

### 5. Deploy MediCart Application

```bash
# Via Helm
helm upgrade --install medicart helm/medicart \
  --namespace medicart \
  --create-namespace \
  --values helm/medicart/values-dev.yaml \
  --set image.repository=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/medicart-api \
  --set image.tag=latest \
  --wait

# Verify
kubectl get pods -n medicart
kubectl get svc -n medicart
kubectl logs -n medicart -l app.kubernetes.io/name=medicart --tail=50
```

### 6. Install ArgoCD (GitOps)

```bash
kubectl create namespace argocd
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Deploy MediCart ArgoCD Application
kubectl apply -f argocd/apps/medicart.yaml

# Get ArgoCD initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

---

## Rollback Procedures

### Application Rollback (Helm)

```bash
# List releases
helm history medicart -n medicart

# Rollback to previous revision
helm rollback medicart -n medicart

# Rollback to specific revision
helm rollback medicart 3 -n medicart
```

### Infrastructure Rollback (Terraform)

```bash
# Terraform state is versioned in S3
# Restore previous tfstate from S3 versioning if needed

# For resource-level rollback:
terraform plan -target=module.eks -var-file="../environments/dev/terraform.tfvars"
terraform apply -target=module.eks ...
```

---

## Health Verification

```bash
# Infrastructure health
ENVIRONMENT=dev AWS_REGION=us-east-1 python scripts/check_infra.py

# Pod health
kubectl get pods -n medicart
kubectl describe pod -n medicart -l app.kubernetes.io/name=medicart

# API health
kubectl port-forward svc/medicart-api 8080:80 -n medicart &
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/products

# Logs
kubectl logs -n medicart -l app.kubernetes.io/name=medicart -f
```

---

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| Pods in CrashLoopBackOff | `kubectl logs -n medicart <pod>` | Check env vars, image tag |
| ImagePullBackOff | `kubectl describe pod -n medicart <pod>` | Verify ECR auth, image exists |
| RDS connection refused | Security Group, subnet group | Verify VPC, SG allows :5432 from EKS |
| Terraform state lock | DynamoDB table | `terraform force-unlock LOCK_ID` |
| HPA not scaling | `kubectl describe hpa -n medicart` | Verify metrics-server is running |
