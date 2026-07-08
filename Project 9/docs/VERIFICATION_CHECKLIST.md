# MediCart Platform — Verification & Validation Checklist

## Build Validation

- [ ] `pip install -r docker/requirements.txt` — no dependency conflicts
- [ ] `pytest docker/src/tests/ scripts/tests/ --cov=docker/src -v` — all tests pass
- [ ] Coverage >= 80% (SonarCloud quality gate)
- [ ] `docker build -t medicart-api:test docker/` — image builds successfully
- [ ] `docker run -p 8080:8080 medicart-api:test` — container starts
- [ ] `curl http://localhost:8080/health` — returns `{"status": "healthy"}`
- [ ] `curl http://localhost:8080/api/v1/products` — returns product list

## Terraform Validation

- [ ] `terraform fmt -check -recursive` — no formatting issues
- [ ] `terraform init -backend=false` — providers downloaded
- [ ] `terraform validate` — configuration valid
- [ ] `terraform plan` (dev) — plan generates without errors
- [ ] No sensitive values exposed in plan output

## Infrastructure Provisioning

- [ ] VPC created with 3 public + 3 private subnets
- [ ] NAT Gateway active
- [ ] VPC Flow Logs streaming to CloudWatch
- [ ] EKS cluster status: ACTIVE
- [ ] EKS node group: all nodes Ready
- [ ] EKS add-ons: coredns, kube-proxy, vpc-cni installed
- [ ] RDS instance status: available
- [ ] RDS encrypted storage confirmed
- [ ] ECR repository created with lifecycle policy
- [ ] S3 bucket versioning enabled, public access blocked
- [ ] Secrets Manager secrets created
- [ ] WAF v2 ACL active
- [ ] CloudWatch dashboard visible

## Kubernetes Validation

- [ ] `kubectl get nodes` — all nodes Ready
- [ ] `kubectl get pods -n medicart` — all pods Running
- [ ] `kubectl get hpa -n medicart` — HPA active
- [ ] Liveness probe: responding 200
- [ ] Readiness probe: responding 200

## API Functionality

- [ ] `GET /` — platform info returned
- [ ] `GET /health` — healthy
- [ ] `GET /ready` — ready
- [ ] `GET /api/v1/products` — 5 products returned
- [ ] `GET /api/v1/products/PROD-001` — specific product returned
- [ ] `GET /api/v1/products?category=medicines` — filtered results
- [ ] `GET /api/v1/products/PROD-999` — 404 returned
- [ ] `GET /api/v1/inventory` — inventory summary returned
- [ ] `GET /api/v1/orders` — order list returned
- [ ] `GET /api/v1/orders/ORD-2024-00001` — specific order returned
- [ ] `GET /api/v1/orders/ORD-XXXX` — 404 returned
- [ ] `GET /api/v1/shipments/MCTK-9283747` — tracking events returned
- [ ] `GET /api/v1/analytics/summary` — analytics data returned
- [ ] `GET /api/v1/prescriptions` — prescription list returned

## CI/CD Pipeline

- [ ] GitHub Actions workflow triggered on push to main
- [ ] pytest job passes
- [ ] SonarCloud analysis completes
- [ ] Terraform validate job passes
- [ ] Docker image built and pushed to ECR
- [ ] Helm deployment succeeds on EKS
- [ ] Smoke test passes in pipeline

## GitOps (ArgoCD)

- [ ] ArgoCD installed and running in `argocd` namespace
- [ ] MediCart Application synced (green)
- [ ] Auto-sync enabled
- [ ] Self-heal enabled

## Monitoring & Logging

- [ ] Prometheus scraping MediCart pods
- [ ] Grafana accessible at configured URL
- [ ] Alert rules loaded (check `medicart.api` rule group)
- [ ] CloudWatch log group `/medicart/prod/app` receiving logs
- [ ] CPU alarm configured
- [ ] Memory alarm configured

## Security

- [ ] No credentials committed to git
- [ ] All secrets in Secrets Manager
- [ ] Container running as non-root (UID 1000)
- [ ] Read-only root filesystem
- [ ] WAF rate limiting active
- [ ] S3 public access blocked
- [ ] RDS not publicly accessible
- [ ] EKS private endpoint enabled

## Performance

- [ ] API response < 200ms (p50) under normal load
- [ ] HPA scales up under CPU load
- [ ] HPA scales down after load subsides
- [ ] RDS connection pool stable under load

## Overall System Health

- [ ] `python scripts/check_infra.py` — ALL PASSED
- [ ] No ERROR logs in CloudWatch (last 1h)
- [ ] All Grafana panels showing data
- [ ] Grafana alerts are in green state
