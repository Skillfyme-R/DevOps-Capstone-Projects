# NexaFlow Logistics Platform — AWS Infrastructure (Terraform)
# Provisions: VPC, EKS, RDS PostgreSQL, ElastiCache Redis, S3, Route53, ACM

terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }

  backend "s3" {
    bucket         = "nexaflow-terraform-state"
    key            = "production/nexaflow.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "nexaflow-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Platform    = "NexaFlow"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "platform-team"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# VPC
# ─────────────────────────────────────────────────────────────────────────────
module "vpc" {
  source  = "./modules/vpc"

  name            = "nexaflow-${var.environment}"
  cidr            = var.vpc_cidr
  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true

  cluster_name = local.cluster_name
}

# ─────────────────────────────────────────────────────────────────────────────
# EKS Cluster
# ─────────────────────────────────────────────────────────────────────────────
module "eks" {
  source  = "./modules/eks"

  cluster_name    = local.cluster_name
  cluster_version = "1.30"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  node_groups = {
    application = {
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 20
      desired_size   = 3
      disk_size      = 50
      labels = {
        role = "application"
      }
    }
    compute = {
      instance_types = ["c6i.xlarge"]
      min_size       = 0
      max_size       = 10
      desired_size   = 0
      disk_size      = 50
      labels = {
        role = "compute"
      }
      taints = [{
        key    = "compute"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# RDS PostgreSQL
# ─────────────────────────────────────────────────────────────────────────────
module "rds" {
  source  = "./modules/rds"

  identifier            = "nexaflow-${var.environment}"
  engine_version        = "16.2"
  instance_class        = var.rds_instance_class
  db_name               = "nexaflow"
  username              = "nexaflow"
  password              = var.db_password
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]

  multi_az            = var.environment == "production"
  backup_retention    = var.environment == "production" ? 14 : 3
  storage_size        = 100
  max_storage_size    = 1000
  deletion_protection = var.environment == "production"

  performance_insights_enabled = true
  monitoring_interval          = 60
}

# ─────────────────────────────────────────────────────────────────────────────
# ElastiCache Redis
# ─────────────────────────────────────────────────────────────────────────────
module "elasticache" {
  source  = "./modules/elasticache"

  cluster_id          = "nexaflow-${var.environment}"
  node_type           = var.redis_node_type
  num_cache_nodes     = var.environment == "production" ? 2 : 1
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  allowed_security_groups = [module.eks.node_security_group_id]
}

# ─────────────────────────────────────────────────────────────────────────────
# S3 Buckets
# ─────────────────────────────────────────────────────────────────────────────
module "s3" {
  source  = "./modules/s3"

  environment = var.environment
  buckets = {
    documents  = { versioning = true,  lifecycle_days = 365 }
    backups    = { versioning = true,  lifecycle_days = 90  }
    exports    = { versioning = false, lifecycle_days = 30  }
    assets     = { versioning = false, lifecycle_days = null }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# NexaFlow Application (Helm chart)
# ─────────────────────────────────────────────────────────────────────────────
module "nexaflow_app" {
  source  = "./modules/nexaflow-app"

  depends_on = [module.eks, module.rds, module.elasticache]

  cluster_name       = local.cluster_name
  namespace          = "nexaflow"
  image_tag          = var.image_tag
  replicas           = var.environment == "production" ? 3 : 1
  db_url             = "postgres://nexaflow:${var.db_password}@${module.rds.endpoint}:5432/nexaflow"
  redis_url          = "redis://${module.elasticache.endpoint}:6379/0"
  jwt_secret         = var.jwt_secret
  domain             = var.app_domain
  certificate_arn    = module.acm.certificate_arn
}

# ─────────────────────────────────────────────────────────────────────────────
# ACM Certificate
# ─────────────────────────────────────────────────────────────────────────────
resource "aws_acm_certificate" "nexaflow" {
  domain_name               = var.app_domain
  subject_alternative_names = ["*.${var.app_domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

module "acm" {
  source = "./modules/acm_stub"
  certificate_arn = aws_acm_certificate.nexaflow.arn
}

# ─────────────────────────────────────────────────────────────────────────────
# Locals
# ─────────────────────────────────────────────────────────────────────────────
locals {
  cluster_name = "nexaflow-${var.environment}"
}
