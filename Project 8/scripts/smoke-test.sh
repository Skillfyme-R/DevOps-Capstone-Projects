#!/usr/bin/env bash
# CartFlow smoke test — validates live API endpoints
# Usage: ./scripts/smoke-test.sh [BASE_URL]
# Example: ./scripts/smoke-test.sh http://localhost:5000

set -euo pipefail

BASE_URL="${1:-http://localhost:5000}"
PASS=0
FAIL=0

pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL + 1)); }

echo "═══════════════════════════════════════════════════"
echo "  CartFlow Smoke Test"
echo "  Target: ${BASE_URL}"
echo "═══════════════════════════════════════════════════"

# Health check
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/health")
[ "$STATUS" = "200" ] && pass "GET /health → 200" || fail "GET /health → ${STATUS}"

# Index
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/")
[ "$STATUS" = "200" ] && pass "GET / → 200" || fail "GET / → ${STATUS}"

# Product catalog
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/products")
[ "$STATUS" = "200" ] && pass "GET /api/v1/products → 200" || fail "GET /api/v1/products → ${STATUS}"

# Single product
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/products/p001")
[ "$STATUS" = "200" ] && pass "GET /api/v1/products/p001 → 200" || fail "GET /api/v1/products/p001 → ${STATUS}"

# Product not found
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/products/p999" || true)
[ "$STATUS" = "404" ] && pass "GET /api/v1/products/p999 → 404" || fail "GET /api/v1/products/p999 → ${STATUS} (expected 404)"

# Create order
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/api/v1/orders" \
    -H "Content-Type: application/json" \
    -d '{"customer_email":"test@cartflow.io","items":[{"product_id":"p001","quantity":1}]}')
[ "$STATUS" = "201" ] && pass "POST /api/v1/orders → 201" || fail "POST /api/v1/orders → ${STATUS}"

# List orders
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/orders")
[ "$STATUS" = "200" ] && pass "GET /api/v1/orders → 200" || fail "GET /api/v1/orders → ${STATUS}"

# Metrics
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/metrics/summary")
[ "$STATUS" = "200" ] && pass "GET /metrics/summary → 200" || fail "GET /metrics/summary → ${STATUS}"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "═══════════════════════════════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
