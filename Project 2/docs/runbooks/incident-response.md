# VendorVault — Incident Response Runbook

## Severity Levels

| Level | Response Time | Examples |
|-------|--------------|---------|
| P0 — Critical | 15 min | Platform down, data breach, payment failure cascade |
| P1 — High     | 30 min | Checkout broken, >5% error rate, DB connection failure |
| P2 — Medium   | 2 hours | Slow search, specific vendor store 404, email not sending |
| P3 — Low      | 24 hours | Minor UI bug, analytics delay |

---

## Runbook: Backend API Down (P0)

**Alert:** `BackendDown` fires in Prometheus

### Diagnosis
```bash
# Check pod status
kubectl -n vendorvault get pods -l app=vendorvault-backend

# Check recent events
kubectl -n vendorvault describe deployment vendorvault-backend

# Check recent logs
kubectl -n vendorvault logs -l app=vendorvault-backend --tail=100

# Check health endpoint
curl https://api.vendorvault.io/healthz/ready
```

### Resolution
```bash
# If OOMKilled — increase memory limit temporarily
kubectl -n vendorvault set resources deployment/vendorvault-backend \
  --limits=memory=2Gi

# If CrashLoopBackOff — rollback to last known good
kubectl -n vendorvault rollout undo deployment/vendorvault-backend
kubectl -n vendorvault rollout status deployment/vendorvault-backend

# If deployment issue — force restart
kubectl -n vendorvault rollout restart deployment/vendorvault-backend
```

---

## Runbook: PostgreSQL Unreachable (P0)

**Alert:** `PostgresDown` fires

### Diagnosis
```bash
# Check RDS status in AWS Console or CLI
aws rds describe-db-instances \
  --db-instance-identifier vendorvault-db-production \
  --query 'DBInstances[0].DBInstanceStatus'

# Test connectivity from backend pod
kubectl -n vendorvault exec -it deployment/vendorvault-backend -- \
  psql -h $VV_DB_HOST -U $VV_DB_USER -d $VV_DB_NAME -c "SELECT 1"
```

### Resolution
- **If RDS is failover in progress:** Wait 60–120s for Multi-AZ automatic failover
- **If max connections exceeded:** Kill idle connections via RDS console
- **If disk full:** Increase RDS storage via AWS console (auto-scaling should prevent this)

---

## Runbook: High Error Rate (P1)

**Alert:** `HighErrorRate` fires (>5% 5xx responses)

### Diagnosis
```bash
# Check error logs
kubectl -n vendorvault logs -l app=vendorvault-backend \
  --since=10m | grep '"level":"error"'

# Check Grafana dashboard
# Dashboard: VendorVault API → "Error Rate by Route"

# Check Sentry for grouped errors
# https://sentry.io/organizations/vendorvault/
```

### Common causes and resolutions

| Error Pattern | Likely Cause | Action |
|--------------|--------------|--------|
| `ECONNREFUSED postgres` | DB connection pool exhausted | Scale backend pods |
| `JWT secret not configured` | Missing env var | Check Kubernetes secret |
| `relation "vv_xxx" does not exist` | Migration not run | Run `kubectl apply -k migrations-job` |
| Stripe `invalid_api_key` | Wrong Stripe key | Update Kubernetes secret |

---

## Runbook: Redis Down (P1)

**Alert:** `RedisDown` fires

### Impact
- Cart data served from DB (slower but functional)
- Rate limiting disabled (DDoS risk — monitor traffic)
- Session validation degrades to JWT-only (acceptable)

### Resolution
```bash
# Check ElastiCache status
aws elasticache describe-cache-clusters \
  --cache-cluster-id vendorvault-cache-production

# Backend auto-recovers when Redis comes back
# Monitor: kubectl -n vendorvault logs -l app=vendorvault-backend --since=1m
```

---

## Runbook: No Orders in Last Hour (P2)

**Alert:** `NoOrdersInLastHour` fires

### Diagnosis checklist
1. Check Stripe dashboard for payment failures
2. Check `/api/v1/payments/intent` endpoint responds correctly
3. Verify Stripe webhook is configured and delivering
4. Check frontend `/checkout` for JavaScript errors (Sentry)
5. Test a manual checkout flow in staging

---

## On-Call Contacts

| Role                | Contact         |
|--------------------|-----------------|
| Platform On-Call   | PagerDuty: VendorVault-Platform |
| Backend Lead       | backend-lead@vendorvault.io |
| Database Admin     | dba@vendorvault.io |
| Payment Escalation | payments@vendorvault.io |

## Monitoring Links

- Grafana:  https://grafana.vendorvault.io
- Prometheus: https://prometheus.vendorvault.io
- Sentry:  https://sentry.io/organizations/vendorvault
- AWS Console: https://console.aws.amazon.com
