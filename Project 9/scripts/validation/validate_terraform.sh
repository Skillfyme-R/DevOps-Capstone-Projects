#!/bin/bash
# MediNova — Terraform Validation Script
set -euo pipefail

TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../terraform" && pwd)"

echo "=== MediNova Terraform Validation ==="
echo "Directory: $TERRAFORM_DIR"
echo ""

cd "$TERRAFORM_DIR"

echo "[1/4] Checking Terraform version..."
terraform version

echo ""
echo "[2/4] Format check..."
terraform fmt -check -recursive && echo "Format OK" || (echo "FAIL: Run 'terraform fmt -recursive'" && exit 1)

echo ""
echo "[3/4] Initializing (no backend)..."
terraform init -backend=false -input=false

echo ""
echo "[4/4] Validating configuration..."
terraform validate && echo "Validation PASSED"

echo ""
echo "=== All Terraform checks passed ==="
