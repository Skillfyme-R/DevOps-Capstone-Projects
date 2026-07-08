#!/bin/bash
# MediNova — Bootstrap Terraform Remote State
# Creates S3 bucket + DynamoDB lock table before first terraform init
set -euo pipefail

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"
BUCKET_NAME="medinova-tfstate-${ACCOUNT_ID}"
TABLE_NAME="medinova-state-lock"

echo "=== MediNova Terraform State Bootstrap ==="
echo "Account : $ACCOUNT_ID"
echo "Region  : $REGION"
echo "Bucket  : $BUCKET_NAME"
echo "Table   : $TABLE_NAME"
echo ""

# Create S3 bucket
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "S3 bucket already exists: $BUCKET_NAME"
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION"
  echo "Created S3 bucket: $BUCKET_NAME"
fi

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled
echo "Versioning enabled"

# Block public access
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo "Public access blocked"

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
echo "Encryption enabled"

# Create DynamoDB lock table
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" 2>/dev/null; then
  echo "DynamoDB table already exists: $TABLE_NAME"
else
  aws dynamodb create-table \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"
  echo "Created DynamoDB table: $TABLE_NAME"
fi

echo ""
echo "=== Bootstrap complete ==="
echo ""
echo "Next step — update terraform/backend.tf:"
echo "  bucket = \"${BUCKET_NAME}\""
echo ""
echo "Then run: terraform init"
