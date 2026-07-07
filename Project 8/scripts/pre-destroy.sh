#!/usr/bin/env bash
# CartFlow pre-destroy cleanup
# Run this BEFORE terraform destroy to remove AWS-managed resources
# that Terraform cannot delete while still in use (ELBs, etc.)

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-cartflow-prod}"
NAMESPACE="${NAMESPACE:-cartflow}"

echo "═══════════════════════════════════════════════════"
echo "  CartFlow Pre-Destroy Cleanup"
echo "  Cluster : ${CLUSTER_NAME}"
echo "  Region  : ${AWS_REGION}"
echo "═══════════════════════════════════════════════════"

echo ""
echo "Step 1 — Removing Kubernetes LoadBalancer service..."
kubectl delete svc cartflow-api-service -n "${NAMESPACE}" --ignore-not-found=true
echo "  Done."

echo ""
echo "Step 2 — Waiting for AWS to delete the Load Balancer (60s)..."
sleep 60

echo ""
echo "Step 3 — Verifying Load Balancers are cleared..."
aws elb describe-load-balancers \
    --region "${AWS_REGION}" \
    --query 'LoadBalancerDescriptions[*].LoadBalancerName' \
    --output table 2>/dev/null || echo "  No classic ELBs found."

aws elbv2 describe-load-balancers \
    --region "${AWS_REGION}" \
    --query 'LoadBalancers[*].[LoadBalancerName,State.Code]' \
    --output table 2>/dev/null || echo "  No ALB/NLBs found."

echo ""
echo "Step 4 — Deleting CartFlow Kubernetes namespace..."
kubectl delete namespace "${NAMESPACE}" --ignore-not-found=true
echo "  Done."

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Pre-destroy cleanup complete."
echo "  You may now run: cd terraform && terraform destroy"
echo "═══════════════════════════════════════════════════"
