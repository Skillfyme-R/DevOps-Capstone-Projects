# ShieldGrid Deployment Guide

## Environments

| Environment | Purpose | Deployed on |
|---|---|---|
| local | Developer workstation | Docker Compose |
| staging | Integration testing, QA | AWS EKS (auto on merge to main) |
| prod | Live SaaS | AWS EKS (on version tag + approval) |

---

## Local Stack

```bash
# Start all services
docker compose up --build -d

# Tail logs
docker compose logs -f api

# Run migrations
docker compose exec api alembic upgrade head

# Tear down (preserves volumes)
docker compose down

# Full reset including data
docker compose down -v
```

---

## AWS Infrastructure Setup

### Prerequisites

```bash
aws --version        # AWS CLI v2
terraform --version  # >= 1.8
kubectl version      # >= 1.29
helm version         # >= 3.15
```

### First-time Bootstrap

1. Create the Terraform state bucket and DynamoDB lock table:

```bash
aws s3api create-bucket \
  --bucket shieldgrid-terraform-state \
  --region us-east-1

aws dynamodb create-table \
  --table-name shieldgrid-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

2. Apply infrastructure:

```bash
cd infrastructure/terraform/environments/prod

terraform init
terraform workspace new prod
terraform plan -out=tfplan
terraform apply tfplan
```

3. Configure kubectl:

```bash
aws eks update-kubeconfig --name shieldgrid-prod --region us-east-1
```

4. Install Cluster Add-ons (via Helm):

```bash
# AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=shieldgrid-prod \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Metrics Server (for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Deploying the Application

ShieldGrid uses Kustomize overlays to manage environment-specific configuration.

```bash
# Staging
kubectl apply -k infrastructure/kubernetes/overlays/staging
kubectl rollout status deployment/shieldgrid-api -n shieldgrid

# Production (use CI/CD — not manual)
kubectl apply -k infrastructure/kubernetes/overlays/prod
kubectl rollout status deployment/shieldgrid-api -n shieldgrid --timeout=10m
```

---

## Secrets Management

Never commit secrets. Inject them from AWS Secrets Manager:

```bash
# Store API secrets
aws secretsmanager create-secret \
  --name "shieldgrid/prod/api-env" \
  --secret-string "$(cat <<'EOF'
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
DATABASE_URL=postgresql+asyncpg://shieldgrid_admin:<password>@<rds-endpoint>:5432/shieldgrid
REDIS_URL=redis://<elasticache-endpoint>:6379/0
AWS_REGION=us-east-1
SMTP_PASSWORD=<smtp-password>
EOF
)"
```

In CI/CD, the deploy workflow retrieves this secret and writes it to the Kustomize secret generator input file (never stored in git).

---

## Observability

### Metrics

Prometheus scrapes `/metrics` on port 8000 (exposed by the `prometheus-client` library). The following custom metrics are tracked:

- `shieldgrid_scans_total` — counter by scan type and status
- `shieldgrid_findings_total` — counter by severity and scanner
- `shieldgrid_security_score` — gauge per project
- `http_request_duration_seconds` — histogram (FastAPI instrumentation)

Import the Grafana dashboard from `infrastructure/grafana/`.

### Log Aggregation

All services emit structured JSON logs (via `structlog`). In production, ship logs to your preferred destination:

- AWS CloudWatch Logs (via Fluent Bit DaemonSet)
- Datadog, Splunk, or Elastic via their respective agents

---

## Rollback Procedure

### Kubernetes rollback (manual)

```bash
# View rollout history
kubectl rollout history deployment/shieldgrid-api -n shieldgrid

# Roll back to previous revision
kubectl rollout undo deployment/shieldgrid-api -n shieldgrid

# Roll back to specific revision
kubectl rollout undo deployment/shieldgrid-api -n shieldgrid --to-revision=3
```

### Database rollback

```bash
# Roll back last migration
kubectl exec -n shieldgrid deploy/shieldgrid-api -- alembic downgrade -1

# Roll back to specific revision
kubectl exec -n shieldgrid deploy/shieldgrid-api -- alembic downgrade 0001
```

---

## Scaling

The API HPA automatically scales between 2–20 replicas based on CPU (65%) and memory (80%) utilisation. For manual override:

```bash
kubectl scale deployment/shieldgrid-api --replicas=10 -n shieldgrid
```

For production traffic spikes, Cluster Autoscaler expands the EKS node group automatically (configured for 3–20 nodes).
