#!/bin/bash
# MediNova — Infrastructure Cleanup Script
# WARNING: This destroys all MediNova AWS resources for the specified environment.
set -euo pipefail

ENVIRONMENT="${1:-}"
if [[ -z "$ENVIRONMENT" ]]; then
  echo "Usage: $0 <environment>"
  echo "  Environments: dev, staging"
  echo "  NOTE: prod environment cannot be destroyed via this script."
  exit 1
fi

if [[ "$ENVIRONMENT" == "prod" ]]; then
  echo "ERROR: Production environment cannot be destroyed via this script."
  echo "       Contact the infrastructure team for production teardown."
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TFVARS="$REPO_ROOT/terraform/environments/${ENVIRONMENT}/terraform.tfvars"

echo "=== MediNova Infrastructure Cleanup ==="
echo "Environment : $ENVIRONMENT"
echo ""
echo "WARNING: This will DESTROY all $ENVIRONMENT MediNova resources."
read -r -p "Type the environment name to confirm: " CONFIRM

if [[ "$CONFIRM" != "$ENVIRONMENT" ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "[1/2] Removing Helm release..."
helm uninstall medinova -n medinova 2>/dev/null || echo "No Helm release found"
kubectl delete namespace medinova 2>/dev/null || echo "Namespace already removed"

echo ""
echo "[2/2] Destroying Terraform infrastructure..."
cd "$REPO_ROOT/terraform"
terraform destroy \
  -var-file="environments/${ENVIRONMENT}/terraform.tfvars" \
  -var="db_master_password=PLACEHOLDER" \
  -var="patient_records_bucket=medinova-${ENVIRONMENT}-patient-records-placeholder" \
  -var="app_assets_bucket=medinova-${ENVIRONMENT}-app-assets-placeholder" \
  -auto-approve

echo ""
echo "=== MediNova $ENVIRONMENT infrastructure destroyed ==="
