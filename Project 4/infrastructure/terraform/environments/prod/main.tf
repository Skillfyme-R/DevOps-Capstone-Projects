terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "shieldgrid-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/shieldgrid-terraform"
    dynamodb_table = "shieldgrid-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.common_tags
  }
}

locals {
  environment = "prod"
  common_tags = {
    Project     = "ShieldGrid"
    Environment = local.environment
    ManagedBy   = "Terraform"
    Owner       = "platform-team"
  }
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }

# ─── KMS ─────────────────────────────────────────────────────────────────────
resource "aws_kms_key" "shieldgrid" {
  description             = "ShieldGrid production encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = local.common_tags
}

resource "aws_kms_alias" "shieldgrid" {
  name          = "alias/shieldgrid-prod"
  target_key_id = aws_kms_key.shieldgrid.key_id
}

# ─── VPC ─────────────────────────────────────────────────────────────────────
module "vpc" {
  source = "../../modules/vpc"

  environment         = local.environment
  vpc_cidr            = "10.0.0.0/16"
  availability_zones  = slice(data.aws_availability_zones.available.names, 0, 3)
  flow_log_role_arn   = aws_iam_role.flow_logs.arn
  flow_log_bucket_arn = module.s3.reports_bucket_arn
  tags                = local.common_tags
}

# ─── EKS ─────────────────────────────────────────────────────────────────────
module "eks" {
  source = "../../modules/eks"

  environment            = local.environment
  kubernetes_version     = "1.30"
  private_subnet_ids     = module.vpc.private_subnet_ids
  kms_key_arn            = aws_kms_key.shieldgrid.arn
  public_endpoint_enabled = false
  node_instance_types    = ["m5.2xlarge", "m5a.2xlarge"]
  use_spot               = false
  node_desired           = 4
  node_min               = 3
  node_max               = 20
  tags                   = local.common_tags
}

# ─── RDS ─────────────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  environment                = local.environment
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  allowed_security_group_ids = []  # populated from eks node sg in practice
  kms_key_arn                = aws_kms_key.shieldgrid.arn
  master_password            = var.db_master_password
  instance_class             = "db.r6g.xlarge"
  allocated_storage_gb       = 200
  max_storage_gb             = 2000
  multi_az                   = true
  deletion_protection        = true
  backup_retention_days      = 35
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  tags                       = local.common_tags
}

# ─── S3 ──────────────────────────────────────────────────────────────────────
module "s3" {
  source = "../../modules/s3"

  environment = local.environment
  account_id  = data.aws_caller_identity.current.account_id
  kms_key_arn = aws_kms_key.shieldgrid.arn
  tags        = local.common_tags
}

# ─── Supporting IAM roles ─────────────────────────────────────────────────────
resource "aws_iam_role" "flow_logs" {
  name = "shieldgrid-prod-vpc-flow-logs"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" } }]
  })
}

resource "aws_iam_role" "rds_monitoring" {
  name = "shieldgrid-prod-rds-monitoring"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
