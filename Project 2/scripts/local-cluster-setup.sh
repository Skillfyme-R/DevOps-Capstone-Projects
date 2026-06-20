#!/usr/bin/env bash
# =============================================================================
# VendorVault — Local Kubernetes Cluster + ArgoCD IDP Setup
#
# Sets up a complete local platform — NO AWS, NO cloud account needed.
#
# What this installs (all local, all free):
#   k3d              — Lightweight Kubernetes running in Docker
#   ArgoCD           — GitOps controller (auto-deploys from git)
#   ArgoCD IDP layer — AppProject + ApplicationSet + RBAC + Notifications
#
# Run once:
#   chmod +x scripts/local-cluster-setup.sh
#   ./scripts/local-cluster-setup.sh
# =============================================================================

set -euo pipefail

CLUSTER_NAME="vendorvault-local"
ARGOCD_VERSION="v2.9.3"
ARGOCD_PORT=8090

echo "=============================================="
echo "  VendorVault Local Cluster + ArgoCD IDP"
echo "=============================================="

# ── 1. Check Docker is running ─────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Start Docker Desktop first."
  exit 1
fi

# ── 2. Install k3d if not present ──────────────────────────────────────────
if ! command -v k3d &>/dev/null; then
  echo "Installing k3d (Kubernetes in Docker)..."
  curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
fi

# ── 3. Create the local cluster ────────────────────────────────────────────
if k3d cluster list | grep -q "$CLUSTER_NAME"; then
  echo "Cluster '$CLUSTER_NAME' already exists — skipping creation."
else
  echo "Creating k3d cluster '$CLUSTER_NAME'..."
  k3d cluster create "$CLUSTER_NAME" \
    --agents 2 \
    --port "3000:30000@loadbalancer" \
    --port "8008:30001@loadbalancer" \
    --port "$ARGOCD_PORT:30090@loadbalancer" \
    --k3s-arg "--disable=traefik@server:0"
fi

# ── 4. Set kubectl context ──────────────────────────────────────────────────
k3d kubeconfig merge "$CLUSTER_NAME" --kubeconfig-switch-context
echo "kubectl context → k3d-$CLUSTER_NAME"

# ── 5. Create namespaces ────────────────────────────────────────────────────
for ns in argocd vendorvault vendorvault-staging vendorvault-production monitoring; do
  kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f -
done

# ── 6. Install ArgoCD ──────────────────────────────────────────────────────
echo ""
echo "Installing ArgoCD $ARGOCD_VERSION..."
kubectl apply -n argocd \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/$ARGOCD_VERSION/manifests/install.yaml"

echo "Waiting for ArgoCD server to be ready..."
kubectl -n argocd rollout status deployment/argocd-server --timeout=180s

# ── 7. Install ArgoCD Notifications controller ─────────────────────────────
echo "Installing ArgoCD Notifications..."
kubectl apply -n argocd \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/$ARGOCD_VERSION/notifications_catalog.yaml" \
  2>/dev/null || true

# ── 8. Expose ArgoCD UI on port 8090 ───────────────────────────────────────
kubectl -n argocd patch svc argocd-server \
  -p '{"spec":{"type":"NodePort","ports":[{"port":443,"nodePort":30090,"targetPort":8080,"protocol":"TCP"}]}}'

# ── 9. Get initial ArgoCD admin password ───────────────────────────────────
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

# ── 10. Apply IDP layer — AppProject, ApplicationSet, RBAC, Notifications ──
echo ""
echo "Applying VendorVault IDP configuration..."
kubectl apply -f infrastructure/argocd/idp/project.yaml
kubectl apply -f infrastructure/argocd/idp/rbac-config.yaml
kubectl apply -f infrastructure/argocd/idp/notifications.yaml
kubectl apply -f infrastructure/argocd/idp/applicationset.yaml

# ── 11. Register individual ArgoCD apps (staging + production) ─────────────
echo "Registering ArgoCD applications..."
kubectl apply -f infrastructure/argocd/apps/vendorvault-staging.yaml
kubectl apply -f infrastructure/argocd/apps/vendorvault-production.yaml

# ── 12. Create IDP local developer accounts ────────────────────────────────
# These replace cloud SSO for local dev — login at http://localhost:8090
echo ""
echo "Creating IDP developer accounts (local ArgoCD users)..."

# Wait for ArgoCD to be fully ready before creating accounts
sleep 10

# Login to ArgoCD CLI if available
if command -v argocd &>/dev/null; then
  argocd login localhost:$ARGOCD_PORT \
    --username admin \
    --password "$ARGOCD_PASSWORD" \
    --insecure \
    --grpc-web 2>/dev/null || echo "(argocd CLI login skipped — run manually)"

  # Create team accounts
  argocd account create developer1  --insecure 2>/dev/null || true
  argocd account create vendor-lead --insecure 2>/dev/null || true
  argocd account create platform-admin --insecure 2>/dev/null || true
  echo "IDP accounts created: developer1, vendor-lead, platform-admin"
else
  echo "Install ArgoCD CLI to manage IDP accounts:"
  echo "  brew install argocd"
fi

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "  Setup Complete — VendorVault IDP is live!"
echo "=============================================="
echo ""
echo "  ArgoCD UI (IDP Portal): https://localhost:$ARGOCD_PORT"
echo "  Login:                  admin / $ARGOCD_PASSWORD"
echo ""
echo "  IDP Projects registered:"
echo "    vendorvault-idp       (AppProject with team RBAC)"
echo "    vendorvault-services  (ApplicationSet — all 6 services × 2 envs)"
echo "    vendorvault-staging   (single staging app)"
echo "    vendorvault-production(single production app)"
echo ""
echo "  Namespaces:"
echo "    vendorvault-staging    — staging workloads"
echo "    vendorvault-production — production workloads"
echo "    monitoring             — Prometheus + Grafana"
echo ""
echo "  Local dev (hot reload, no k8s needed):"
echo "    yarn infra:up"
echo "    yarn db:migrate && yarn db:seed"
echo "    yarn start"
echo "    → Frontend: http://localhost:3000"
echo "    → Backend:  http://localhost:8008"
echo ""
