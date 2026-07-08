# MediNova Health Solutions — Operations Runbook

## On-Call Contacts

| Role | Responsibility |
|------|---------------|
| Platform Engineer | EKS, Terraform, networking |
| Backend Engineer | Flask API, database queries |
| Security Engineer | KMS, WAF, compliance incidents |

---

## 1. Health Check Procedures

### Cluster Health

```bash
# Node status
kubectl get nodes -o wide

# Pod status (medinova namespace)
kubectl get pods -n medinova

# Recent events
kubectl get events -n medinova --sort-by='.lastTimestamp' | tail -30

# HPA status
kubectl get hpa -n medinova
```

### API Health

```bash
# Port-forward for quick check
kubectl port-forward -n medinova svc/medinova 8080:80 &
curl http://localhost:8080/health
curl http://localhost:8080/ready
kill %1
```

### Database Health

```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier "medinova-${ENV}-postgresql" \
  --query 'DBInstances[0].DBInstanceStatus'

# CloudWatch RDS metrics (last 1 hour)
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value="medinova-${ENV}-postgresql" \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

---

## 2. Incident Response

### Pod Crash Loop

```bash
# Find crashing pods
kubectl get pods -n medinova | grep -v Running

# Get pod logs (last 200 lines including previous container)
kubectl logs -n medinova <pod-name> --tail=200 --previous

# Describe pod for events
kubectl describe pod -n medinova <pod-name>
```

**Common causes:**
- OOMKilled → increase memory limit in `helm/medinova/values.yaml` (`resources.limits.memory`)
- Liveness probe failed → check `/health` endpoint in application logs
- Image pull error → verify ECR credentials and image tag exists

### API High Error Rate (CloudWatch Alarm)

1. Check application logs:
```bash
aws logs filter-log-events \
  --log-group-name "/medinova/${ENV}/appointment-api" \
  --start-time $(date -d '30 minutes ago' +%s%3N 2>/dev/null || date -v-30M +%s)000 \
  --filter-pattern "ERROR"
```

2. Check if it's a database issue:
```bash
aws logs filter-log-events \
  --log-group-name "/medinova/${ENV}/application" \
  --filter-pattern "connection" \
  --start-time $(date -d '30 minutes ago' +%s%3N 2>/dev/null || date -v-30M +%s)000
```

3. If WAF is blocking legitimate traffic, check WAF logs in CloudWatch.

### RDS CPU High (>75%)

```bash
# Check active connections and slow queries via Performance Insights
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier "db:medinova-${ENV}-postgresql" \
  --metric-queries '[{"Metric":"db.load.avg"}]' \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period-in-seconds 60
```

If connection count is high:
- Check if HPA scaled too many pods (exceeding `rds_connections_high` alarm at 100)
- Consider adding connection pooling (PgBouncer) as a sidecar

### Node Memory High (>85%)

```bash
# Check per-node memory
kubectl top nodes

# Check per-pod memory
kubectl top pods -n medinova

# If one pod is consuming excessive memory, restart it
kubectl delete pod -n medinova <pod-name>
```

If the cluster is generally under pressure, scale the node group:
```bash
aws eks update-nodegroup-config \
  --cluster-name "medinova-${ENV}-cluster" \
  --nodegroup-name "medinova-${ENV}-api-nodes" \
  --scaling-config minSize=2,maxSize=10,desiredSize=4
```

---

## 3. Rollback Procedures

### Application Rollback

```bash
# List Helm release history
helm history medinova -n medinova

# Rollback to previous revision
helm rollback medinova 0 -n medinova   # 0 = previous

# Rollback to specific revision
helm rollback medinova <REVISION> -n medinova

# Verify pods recovered
kubectl rollout status deployment/medinova-api -n medinova
```

### Infrastructure Rollback

Terraform state is stored in S3 with versioning. To revert:

```bash
# List state file versions
aws s3api list-object-versions \
  --bucket "medinova-tfstate-${ACCOUNT_ID}" \
  --prefix "medinova/${ENV}/terraform.tfstate"

# Restore a specific version (replace VERSION_ID)
aws s3api get-object \
  --bucket "medinova-tfstate-${ACCOUNT_ID}" \
  --key "medinova/${ENV}/terraform.tfstate" \
  --version-id <VERSION_ID> \
  restored-state.tfstate

# Then force-push the restored state
terraform state push restored-state.tfstate
```

---

## 4. Scaling Operations

### Manual HPA Override

```bash
# Temporarily force a specific replica count
kubectl scale deployment medinova-api -n medinova --replicas=5

# Note: HPA will override this once it next evaluates metrics.
# To set a floor, update HPA minReplicas via Helm:
helm upgrade medinova helm/medinova \
  --namespace medinova \
  --set autoscaling.minReplicas=4
```

### Database Scaling

RDS instance class change (causes a reboot — schedule maintenance window):
```bash
# Update terraform.tfvars:
# db_instance_class = "db.t3.large"

terraform apply \
  -var-file="environments/${ENV}/terraform.tfvars" \
  -target="module.database.aws_db_instance.medinova"
```

---

## 5. Backup and Restore

### RDS Automated Backups

Automated backups run daily during the configured maintenance window. Retention: 3 days (dev), 7 days (staging), 14 days (prod).

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier "medinova-${ENV}-postgresql" \
  --query 'DBSnapshots[*].[SnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table

# Restore to new RDS instance from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "medinova-${ENV}-postgresql-restore" \
  --db-snapshot-identifier <SNAPSHOT_ID> \
  --db-instance-class db.t3.medium \
  --db-subnet-group-name "medinova-${ENV}-db-subnet-group"
```

### S3 Patient Records Backup

S3 versioning is enabled on the `patient-records` bucket. Deleted objects are marked with a delete marker and can be restored:

```bash
# List versions of a specific object
aws s3api list-object-versions \
  --bucket "${PATIENT_BUCKET}" \
  --prefix "patients/patient-001/"

# Restore a specific version
aws s3api copy-object \
  --bucket "${PATIENT_BUCKET}" \
  --copy-source "${PATIENT_BUCKET}/patients/patient-001/record.json?versionId=<VERSION_ID>" \
  --key "patients/patient-001/record.json"
```

---

## 6. Certificate and Secret Rotation

### KMS Key

KMS key rotation is automatic (annual). No manual action required. Existing ciphertext remains decryptable.

### Secrets Manager — DB Credentials

```bash
# Rotate DB password manually
NEW_PASSWORD="MediNova@NewSecure#$(date +%Y)!"

# Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id "medinova/${ENV}/db-credentials" \
  --secret-string "{\"password\": \"${NEW_PASSWORD}\", ...}"

# Update RDS (will cause brief connection interruption)
aws rds modify-db-instance \
  --db-instance-identifier "medinova-${ENV}-postgresql" \
  --master-user-password "${NEW_PASSWORD}" \
  --apply-immediately
```

---

## 7. HIPAA Audit Log Queries

### Patient Access Audit

```bash
# Query audit log for a specific patient
aws logs filter-log-events \
  --log-group-name "/medinova/${ENV}/patient-access-audit" \
  --filter-pattern "{ $.patient_id = \"P001\" }" \
  --start-time 1704067200000 \
  --end-time $(date +%s%3N)

# All access in last 24 hours
aws logs filter-log-events \
  --log-group-name "/medinova/${ENV}/patient-access-audit" \
  --start-time $(( $(date +%s) - 86400 ))000
```

### VPC Flow Log Queries (Athena)

For network forensics, use Athena on the VPC flow logs stored in CloudWatch. Set up a log query:

```bash
aws logs start-query \
  --log-group-name "/medinova/${ENV}/vpc-flow-logs" \
  --start-time $(( $(date +%s) - 3600 )) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, srcAddr, dstAddr, action | filter action = "REJECT" | sort @timestamp desc | limit 50'
```

---

## 8. WAF Operations

### Check WAF Block Rate

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value="medinova-${ENV}-waf" Name=Rule,Value=ALL Name=Region,Value=us-east-1 \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum
```

### Temporarily Increase Rate Limit

If a legitimate integration is being rate-limited, update the WAF rule via Terraform:

```hcl
# modules/security/main.tf — increase limit temporarily
limit = 5000   # from 1000
```

---

## 9. Common kubectl Commands Reference

```bash
# Get all resources in medinova namespace
kubectl get all -n medinova

# Follow logs in real time
kubectl logs -n medinova -l app.kubernetes.io/name=medinova -f

# Execute a shell in a pod
kubectl exec -it -n medinova <pod-name> -- sh

# Check ConfigMaps and Secrets
kubectl get configmaps,secrets -n medinova

# Force restart all pods (rolling)
kubectl rollout restart deployment/medinova-api -n medinova

# Get pod resource usage
kubectl top pods -n medinova --containers
```

---

*MediNova Health Solutions Operations Runbook v1.0*
