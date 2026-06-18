# NexusFinance Incident Response Runbook

## Severity Levels

| Severity | Description                                           | Response Time |
|----------|-------------------------------------------------------|---------------|
| P0       | Platform down, all transactions failing               | Immediate     |
| P1       | Core feature broken (payments/accounts), data at risk | 15 minutes    |
| P2       | Non-critical feature degraded                         | 1 hour        |
| P3       | Minor issue, workaround available                     | Next business day |

## P0: Platform Down

### Symptoms
- Grafana: `BackendDown` alert firing
- Users cannot log in or access the app
- HTTP 502/503 from load balancer

### Response Steps

```bash
# 1. Check pod status
kubectl get pods -n nexusfinance-production -l app=nexusfinance-backend

# 2. Check recent pod logs
kubectl logs -n nexusfinance-production -l app=nexusfinance-backend --tail=100 --previous

# 3. Check events (out-of-memory kills, scheduling failures)
kubectl get events -n nexusfinance-production --sort-by='.lastTimestamp' | tail -20

# 4. If pods are crash-looping, check if it's a DB issue
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h $NEXUS_DB_HOST -U nexus_user -d nexusfinance_prod -c "SELECT 1"

# 5. Emergency rollback (if new deployment caused the issue)
kubectl rollout undo deployment/nexusfinance-backend -n nexusfinance-production
kubectl rollout status deployment/nexusfinance-backend -n nexusfinance-production

# 6. Scale up if it's a traffic issue
kubectl scale deployment nexusfinance-backend --replicas=10 -n nexusfinance-production
```

## P1: High Error Rate on Payments

### Symptoms
- Grafana: `HighErrorRate` alert on `/api/v1/payments`
- Users reporting payment failures
- Stripe dashboard shows failed payment intents

### Response Steps

```bash
# 1. Check error logs
kubectl logs -n nexusfinance-production -l app=nexusfinance-backend | grep '"route":"/api/v1/payments"' | grep '"level":"error"'

# 2. Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# 3. Check rate limits on payment endpoint (Redis)
redis-cli -u $NEXUS_REDIS_URL KEYS "nexus:rl:payments*" | head -20

# 4. If Stripe is down, enable payment queuing mode
kubectl set env deployment/nexusfinance-backend PAYMENT_QUEUE_MODE=true -n nexusfinance-production
```

## P1: Fraud Spike Detected

### Symptoms
- Grafana: `HighFraudAlertRate` alert
- Unusual geographic pattern in transactions
- Multiple accounts transacting to same beneficiary

### Response Steps

```bash
# 1. Immediately check Datadog fraud dashboard
# URL: https://app.datadoghq.com/dashboard/nexusfinance-fraud

# 2. Pull recent fraud alerts from DB
psql -h $NEXUS_DB_HOST -U nexus_user nexusfinance_prod << 'SQL'
  SELECT user_id, COUNT(*) as alerts, MAX(created_at) as latest
  FROM nexus_fraud_alerts
  WHERE created_at > NOW() - INTERVAL '1 hour'
  AND severity = 'high'
  GROUP BY user_id
  ORDER BY alerts DESC
  LIMIT 20;
SQL

# 3. If coordinated attack detected, enable enhanced verification for new transactions
kubectl set env deployment/nexusfinance-backend ENHANCED_FRAUD_CHECK=true -n nexusfinance-production

# 4. Notify compliance team immediately (legal obligation within 1 hour)
# Send to: compliance@nexusfinance.io, fraud@nexusfinance.io, legal@nexusfinance.io
```

## Communication Templates

### Status Page Update (P0)
```
[INVESTIGATING] We are aware of an issue affecting [service].
Our engineering team is actively investigating.
Impact: [describe user impact]
Next update: [time]
```

### Internal Slack Alert
```
🚨 P0 INCIDENT — NexusFinance [service] is DOWN
Impact: [N] users affected
On-call: @engineer-name
War room: [zoom link]
Status page: https://status.nexusfinance.io
```

## Post-Incident Review

All P0 and P1 incidents require a blameless post-mortem within 48 hours.

Template:
1. **Summary**: What happened, what was the impact?
2. **Timeline**: Minute-by-minute from first alert to resolution
3. **Root Cause**: Why did this happen?
4. **Detection**: How did we find out? Could we have found out faster?
5. **Resolution**: What fixed it?
6. **Action Items**: What changes prevent recurrence? (assign owner + due date)
7. **What went well**: What worked in our response?
