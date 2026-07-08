#!/bin/bash
# MediNova — Application Deployment Script
set -euo pipefail

ENVIRONMENT="${1:-dev}"
IMAGE_TAG="${2:-latest}"
HELM_RELEASE="medinova"
HELM_NS="medinova"
AWS_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/medinova/appointment-api"
EKS_CLUSTER="medinova-${ENVIRONMENT}-cluster"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "=== MediNova Deployment ==="
echo "Environment : $ENVIRONMENT"
echo "Image Tag   : $IMAGE_TAG"
echo "Cluster     : $EKS_CLUSTER"
echo ""

echo "[1/4] Updating kubeconfig..."
aws eks update-kubeconfig --name "$EKS_CLUSTER" --region "$AWS_REGION"

echo ""
echo "[2/4] Deploying via Helm..."
helm upgrade --install "$HELM_RELEASE" "$REPO_ROOT/helm/medinova" \
  --namespace "$HELM_NS" \
  --create-namespace \
  --set image.repository="$ECR_REPO" \
  --set image.tag="$IMAGE_TAG" \
  --set "env[0].value=${ENVIRONMENT}" \
  --wait \
  --timeout 5m

echo ""
echo "[3/4] Verifying rollout..."
kubectl rollout status deployment/medinova-api -n "$HELM_NS" --timeout=120s

echo ""
echo "[4/4] Smoke test..."
POD=$(kubectl get pod -n "$HELM_NS" -l app.kubernetes.io/name=medinova -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n "$HELM_NS" "$POD" -- \
  python -c "import urllib.request; r=urllib.request.urlopen('http://localhost:8080/health'); assert r.status==200"

echo ""
echo "=== MediNova deployment complete: $IMAGE_TAG ==="
