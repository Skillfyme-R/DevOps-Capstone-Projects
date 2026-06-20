# MediCore — Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|---------|
| P0 | Platform-wide outage | < 5 min | All services down, database unreachable |
| P1 | Critical service degraded | < 15 min | Auth service down, patient data inaccessible |
| P2 | Non-critical degradation | < 1 hour | Analytics slow, notifications delayed |
| P3 | Minor issue | < 4 hours | Single chart broken, slow search |

## Common Runbooks

### Database Connection Failure (P0)

```bash
# Check PostgreSQL health
kubectl exec -n medicore deploy/medicore-auth -- \
  curl -s http://localhost:9001/healthz/ready | jq .

# Check pod logs
kubectl logs -n medicore deploy/medicore-auth --since=5m | grep "DB\|postgres\|Knex"

# Verify PostgreSQL pod
kubectl get pods -n medicore -l app=postgres
kubectl exec -n medicore postgres-0 -- pg_isready -U medicore

# Connection pool exhaustion — restart services
kubectl rollout restart deployment/medicore-auth -n medicore
kubectl rollout restart deployment/medicore-patients -n medicore
```

### High Error Rate (P1)

```bash
# Identify failing service
kubectl top pods -n medicore

# Check recent errors
kubectl logs -n medicore deploy/medicore-auth --since=15m | \
  grep '"level":"error"' | jq '.message, .error'

# Scale up replicas for load relief
kubectl scale deployment medicore-auth --replicas=10 -n medicore

# Roll back if deployment caused issue
kubectl rollout undo deployment/medicore-auth -n medicore
kubectl rollout status deployment/medicore-auth -n medicore
```

### Redis Cache Down (P1)

```bash
# Impact: Rate limiting, sessions, and caching are degraded
# Services will fall back to database queries (slower but functional)

# Check Redis status
kubectl exec -n medicore redis-master-0 -- redis-cli ping

# Restart Redis
kubectl rollout restart statefulset/redis-master -n medicore

# Flush corrupted cache if needed (USE WITH CAUTION)
kubectl exec -n medicore redis-master-0 -- \
  redis-cli -a "$REDIS_PASSWORD" FLUSHDB ASYNC
```

### HIPAA Security Event (P0)

If a security event involving PHI (Protected Health Information) is detected:

1. **Immediately isolate** the affected service: `kubectl scale deployment/medicore-patients --replicas=0 -n medicore`
2. **Preserve logs**: `kubectl logs -n medicore --all-containers=true --since=24h > incident-logs-$(date +%s).txt`
3. **Notify the HIPAA Security Officer** within 1 hour
4. **Do NOT delete** any data or logs — they are required for breach assessment
5. **Engage** legal and compliance teams before any public communication

### Certificate Expiry (P2)

```bash
# Check TLS certificate expiry
kubectl get certificate -n medicore
kubectl describe certificate medicore-tls -n medicore

# Force cert-manager renewal
kubectl delete secret medicore-tls -n medicore
# cert-manager will automatically provision a new certificate

# Verify renewal
kubectl get certificate medicore-tls -n medicore -w
```

## Prometheus Alert Responses

| Alert | Action |
|-------|--------|
| `HighErrorRate` | Check service logs → check DB → scale replicas |
| `SlowAPIResponse` | Check Redis → check DB indexes → scale analytics |
| `ServiceDown` | `kubectl rollout restart` → check health probes |
| `PostgresDown` | Check DB pod → check secrets → check network policy |
| `RedisDown` | Restart Redis → services degrade gracefully |
| `NoAppointmentsBooked` | Check frontend → check appointment service → check DB |
| `HighLoginFailureRate` | Review audit logs → check rate limiting → notify security |
