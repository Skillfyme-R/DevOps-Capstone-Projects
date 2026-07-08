# =============================================================================
# MediNova Health Solutions — Root Infrastructure Orchestration
# Company  : MediNova Health Solutions
# Platform : Healthcare Appointment & Patient Management
# Provider : AWS (us-east-1 — HIPAA-eligible)
# =============================================================================

module "networking" {
  source = "../modules/networking"

  name_prefix           = local.name_prefix
  vpc_cidr              = var.vpc_cidr
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  availability_zones    = var.availability_zones
  enable_flow_logs      = var.enable_vpc_flow_logs
  environment           = var.environment
  common_tags           = local.common_tags
}

module "security" {
  source = "../modules/security"

  name_prefix  = local.name_prefix
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  vpc_cidr     = var.vpc_cidr
  common_tags  = local.common_tags
}

module "storage" {
  source = "../modules/storage"

  name_prefix            = local.name_prefix
  environment            = var.environment
  patient_records_bucket = var.patient_records_bucket
  app_assets_bucket      = var.app_assets_bucket
  log_retention_days     = var.log_retention_days
  common_tags            = local.common_tags
}

module "database" {
  source = "../modules/database"

  name_prefix          = local.name_prefix
  environment          = var.environment
  vpc_id               = module.networking.vpc_id
  database_subnet_ids  = module.networking.database_subnet_ids
  db_instance_class    = var.db_instance_class
  db_name              = var.db_name
  db_master_username   = var.db_master_username
  db_master_password   = var.db_master_password
  allocated_storage_gb = var.db_allocated_storage_gb
  backup_retention     = local.db_backup_retention
  multi_az             = local.db_multi_az
  db_security_group_id = module.security.rds_security_group_id
  common_tags          = local.common_tags
}

module "compute" {
  source = "../modules/compute"

  name_prefix          = local.name_prefix
  environment          = var.environment
  cluster_name         = local.cluster_name
  kubernetes_version   = var.kubernetes_version
  private_subnet_ids   = module.networking.private_subnet_ids
  vpc_id               = module.networking.vpc_id
  node_instance_type   = var.node_instance_type
  node_desired_count   = var.node_desired_count
  node_min_count       = var.node_min_count
  node_max_count       = var.node_max_count
  cluster_role_arn     = module.security.eks_cluster_role_arn
  node_role_arn        = module.security.eks_node_role_arn
  common_tags          = local.common_tags
}

module "monitoring" {
  source = "../modules/monitoring"

  name_prefix        = local.name_prefix
  environment        = var.environment
  cluster_name       = local.cluster_name
  alert_email        = var.alert_email
  log_retention_days = var.log_retention_days
  common_tags        = local.common_tags

  depends_on = [module.compute]
}
