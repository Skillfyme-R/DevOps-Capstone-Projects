#!/bin/bash
# MediCart Healthcare Platform — Monitoring Stack Installation
# Installs kube-prometheus-stack (Prometheus + Grafana + Alertmanager) on EKS

set -euo pipefail

NAMESPACE="monitoring"
RELEASE_NAME="medicart-monitoring"
CHART_VERSION="65.0.0"

echo "==> Installing MediCart monitoring stack..."

# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create namespace
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Create Grafana admin secret
if ! kubectl get secret grafana-admin-secret -n "$NAMESPACE" &>/dev/null; then
  kubectl create secret generic grafana-admin-secret \
    -n "$NAMESPACE" \
    --from-literal=admin-user=admin \
    --from-literal=admin-password="$(openssl rand -base64 24)"
  echo "==> Grafana admin secret created"
fi

# Install / upgrade
helm upgrade --install "$RELEASE_NAME" \
  prometheus-community/kube-prometheus-stack \
  --namespace "$NAMESPACE" \
  --version "$CHART_VERSION" \
  --values monitoring/prometheus-values.yaml \
  --wait \
  --timeout 10m

echo ""
echo "==> MediCart monitoring stack installed successfully!"
echo "    Grafana URL: https://grafana.medicart.health"
echo "    Prometheus:  kubectl port-forward svc/${RELEASE_NAME}-prometheus 9090:9090 -n ${NAMESPACE}"
echo "    Alertmanager: kubectl port-forward svc/${RELEASE_NAME}-alertmanager 9093:9093 -n ${NAMESPACE}"
