# MediCart Healthcare Platform — Root Terraform Configuration
# Company: MediCart Health Technologies Pvt. Ltd.

module "s3_bucket" {
  source      = "../modules/s3_bucket"
  bucket_name = var.bucket_name
  environment = var.environment
}

module "vpc" {
  source             = "../modules/vpc"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  public_subnets     = var.public_subnets
  private_subnets    = var.private_subnets
  availability_zones = var.availability_zones
}

module "iam" {
  source      = "../modules/iam"
  environment = var.environment
}

module "ecr" {
  source      = "../modules/ecr"
  environment = var.environment
}

module "eks" {
  source               = "../modules/eks"
  environment          = var.environment
  kubernetes_version   = var.kubernetes_version
  private_subnet_ids   = module.vpc.private_subnet_ids
  vpc_id               = module.vpc.vpc_id
  instance_type        = var.instance_type
  desired_capacity     = var.desired_capacity
  min_capacity         = var.min_capacity
  max_capacity         = var.max_capacity
  eks_cluster_role_arn = module.iam.eks_cluster_role_arn
  eks_nodes_role_arn   = module.iam.eks_nodes_role_arn
}

module "rds" {
  source             = "../modules/rds"
  environment        = var.environment
  instance_class     = var.rds_instance
  allocated_storage  = var.rds_allocated_storage
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  private_subnet_ids = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id
}

module "cloudwatch" {
  source       = "../modules/cloudwatch"
  environment  = var.environment
  cluster_name = module.eks.cluster_name
}

module "waf" {
  source      = "../modules/waf"
  environment = var.environment
}

module "secretsmanager" {
  source      = "../modules/secretsmanager"
  environment = var.environment
  db_username = var.db_username
  db_password = var.db_password
  db_endpoint = module.rds.db_endpoint
  db_name     = var.db_name
}
