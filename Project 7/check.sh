#!/bin/bash
# VaultFlow health check — run from Project 7/ directory
# Usage: bash check.sh

KEY="vf-local-dev-key"
PASS=0; FAIL=0

ok()   { echo "  [OK]   $1"; ((PASS++)); }
fail() { echo "  [FAIL] $1"; ((FAIL++)); }

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│         VaultFlow Health Check          │"
echo "└─────────────────────────────────────────┘"

echo ""
echo "── Containers ──────────────────────────────"
for svc in vaultflow-api vaultflow-ui vaultflow-redis vaultflow-prometheus vaultflow-grafana; do
  status=$(docker inspect --format='{{.State.Status}}' $svc 2>/dev/null)
  if [ "$status" = "running" ]; then ok "$svc is running"
  else fail "$svc is $status"; fi
done

echo ""
echo "── API ─────────────────────────────────────"
health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/health)
if [ "$health" = "200" ]; then ok "GET /health → $health"
else fail "GET /health → $health"; fi

echo ""
echo "── Authenticated Endpoints ─────────────────"
for ep in transactions "expenses/summary" "budgets/variance" forecasts alerts; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "X-VaultFlow-API-Key: $KEY" "http://localhost:9090/api/v1/$ep")
  if [ "$code" = "200" ]; then ok "GET /api/v1/$ep → $code"
  else fail "GET /api/v1/$ep → $code"; fi
done

echo ""
echo "── Data ────────────────────────────────────"
txn=$(curl -s -H "X-VaultFlow-API-Key: $KEY" http://localhost:9090/api/v1/transactions | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
bgt=$(curl -s -H "X-VaultFlow-API-Key: $KEY" http://localhost:9090/api/v1/budgets/variance | python3 -c "import sys,json; print(len(json.load(sys.stdin)['variance']))" 2>/dev/null)
alr=$(curl -s -H "X-VaultFlow-API-Key: $KEY" http://localhost:9090/api/v1/alerts | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)

[ "${txn:-0}" -gt 0 ] && ok "Transactions: $txn records" || fail "Transactions: empty (run: curl -s -X POST -H 'X-VaultFlow-API-Key: $KEY' http://localhost:9090/api/v1/demo/seed)"
[ "${bgt:-0}" -gt 0 ] && ok "Budgets: $bgt records"      || fail "Budgets: empty"
[ "${alr:-0}" -gt 0 ] && ok "Alerts: $alr records"       || fail "Alerts: empty"

echo ""
echo "── Supporting Services ─────────────────────"
redis=$(docker exec vaultflow-redis redis-cli ping 2>/dev/null)
[ "$redis" = "PONG" ] && ok "Redis: PONG" || fail "Redis: not responding"

prom=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9292/-/healthy)
[ "$prom" = "200" ] && ok "Prometheus: healthy" || fail "Prometheus: $prom"

graf=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
[ "$graf" = "200" ] && ok "Grafana: healthy" || fail "Grafana: $graf"

ui=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
[ "$ui" = "200" ] && ok "UI (http://localhost:3000): HTTP $ui" || fail "UI: $ui"

echo ""
echo "─────────────────────────────────────────────"
echo "  Result: $PASS passed, $FAIL failed"
if [ $FAIL -eq 0 ]; then
  echo "  Status: ALL SYSTEMS OPERATIONAL"
else
  echo "  Status: ACTION REQUIRED — check failed items above"
  echo ""
  echo "  Quick fix — load demo data:"
  echo "  curl -s -X POST -H 'X-VaultFlow-API-Key: $KEY' http://localhost:9090/api/v1/demo/seed"
fi
echo ""
