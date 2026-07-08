terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "deploypilot-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "deploypilot-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "deploypilot"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  project = "deploypilot"
  env     = "production"
  name    = "${local.project}-${local.env}"
}

module "networking" {
  source       = "../../modules/networking"
  project_name = local.name
  vpc_cidr     = var.vpc_cidr
  az_count     = 3
  tags = { Project = local.project, Environment = local.env }
}

module "database" {
  source             = "../../modules/database"
  project_name       = local.name
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.database_security_group_id
  db_password        = var.db_password
  instance_class     = "db.r6g.large"
  allocated_storage  = 100
  multi_az           = true
  deletion_protection = true
  tags = { Project = local.project, Environment = local.env }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = local.name
  cluster_version = "1.29"
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  eks_managed_node_groups = {
    system = {
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2
      labels         = { role = "system" }
    }
    workers = {
      instance_types = ["c6i.xlarge"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      labels         = { role = "worker" }
    }
  }

  tags = { Project = local.project, Environment = local.env }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis-subnet-group"
  subnet_ids = module.networking.private_subnet_ids
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${local.name}-redis"
  description                = "DeployPilot production Redis cluster"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 2
  parameter_group_name       = "default.redis7"
  engine_version             = "7.1"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [module.networking.app_security_group_id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true
  tags                       = { Project = local.project, Environment = local.env }
}

resource "aws_s3_bucket" "artifacts" {
  bucket = "${local.name}-artifacts-${data.aws_caller_identity.current.account_id}"
  tags   = { Project = local.project, Environment = local.env }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
  }
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "deploypilot-terraform-state-prod"
  tags   = { Project = local.project }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_dynamodb_table" "state_lock" {
  name         = "deploypilot-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
  tags = { Project = local.project }
}

data "aws_caller_identity" "current" {}
