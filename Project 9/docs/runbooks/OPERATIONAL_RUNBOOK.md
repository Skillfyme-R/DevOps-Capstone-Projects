# MediCart Platform — Operational Runbook

## Daily Operations

### Health Checks

```bash
# Infrastructure health (run daily)
ENVIRONMENT=prod AWS_REGION=us-east-1 python scripts/check_infra.py

# Pod health
kubectl get pods -n medicart -o wide

# HPA status
kubectl get hpa -n medicart

# Recent errors (last 1h)
aws logs filter-log-events \
  --log-group-name "/medicart/prod/app" \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --region us-east-1
```

### Grafana Dashboards

Access: `https://grafana.medicart.health`

Key dashboards:
- **MediCart Operations** — API error rate, latency, pod count
- **Kubernetes Cluster** — node CPU/memory, pod scheduling
- **RDS Metrics** — connections, query latency, storage

---

## Incident Response

### P1 — API Down (all endpoints returning 5xx)

1. Check pod status: `kubectl get pods -n medicart`
2. If CrashLoopBackOff: `kubectl logs -n medicart <pod> --previous`
3. Scale up: `kubectl scale deployment medicart-api --replicas=4 -n medicart`
4. Rollback if needed: `helm rollback medicart -n medicart`
5. Page on-call via PagerDuty / CloudWatch alarm

### P2 — High Error Rate (>5%)

1. Check CloudWatch: dashboard `medicart-prod-operations`
2. Check logs: `kubectl logs -n medicart -l app.kubernetes.io/name=medicart -f`
3. Identify failing endpoint from logs
4. Check RDS connectivity: verify security group, test from pod shell

### P3 — High Latency (p99 > 2s)

1. Check HPA: `kubectl describe hpa medicart-api-hpa -n medicart`
2. Check node CPU: CloudWatch → EC2 → CPUUtilization
3. If CPU-bound: trigger manual scale `kubectl scale deployment medicart-api --replicas=6 -n medicart`
4. Review slow queries in RDS Performance Insights

### RDS Failover (production)

Multi-AZ RDS handles automatic failover (~60s). During failover:
- Application will see brief connection errors
- Gunicorn will retry connections automatically
- Monitor via CloudWatch RDS dashboard

---

## Backup & Restore

### RDS Automated Backups

- Retention: 14 days (prod), 3 days (dev)
- Backup window: 03:00–04:00 UTC
- List snapshots: `aws rds describe-db-snapshots --db-instance-identifier medicart-prod-db`

### Point-in-Time Recovery

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier medicart-prod-db \
  --target-db-instance-identifier medicart-prod-db-restore \
  --restore-time 2024-06-01T03:00:00Z \
  --region us-east-1
```

### S3 Asset Backup

S3 versioning is enabled. Restore previous object version via:
```bash
aws s3api list-object-versions --bucket medicart-prod-assets-ACCOUNT_ID --prefix uploads/
aws s3api get-object --bucket medicart-prod-assets-ACCOUNT_ID \
  --key uploads/file.jpg \
  --version-id VERSION_ID \
  restored-file.jpg
```

---

## Scaling Procedures

### Manual Pod Scale

```bash
kubectl scale deployment medicart-api --replicas=6 -n medicart
```

### EKS Node Scale

```bash
# Update desired capacity
aws eks update-nodegroup-config \
  --cluster-name medicart-prod-cluster \
  --nodegroup-name medicart-prod-nodes \
  --scaling-config minSize=3,maxSize=10,desiredSize=5 \
  --region us-east-1
```

### Emergency Terraform Apply

```bash
cd terraform
terraform plan -target=module.eks \
  -var-file="../environments/prod/terraform.tfvars" \
  -var="desired_capacity=5"
terraform apply -target=module.eks ...
```

---

## Maintenance Windows

| Task | Schedule | Duration | Impact |
|------|----------|----------|--------|
| RDS maintenance | Mon 04:00–05:00 UTC | ≤1h | Brief connection interruption |
| EKS node group updates | Tue 02:00 UTC | ~30m | Rolling, zero downtime |
| Certificate renewal | Automatic (cert-manager) | None | None |
| Prometheus data compaction | Continuous (WAL) | None | None |
