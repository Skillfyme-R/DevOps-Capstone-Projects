# =============================================================================
# MediNova — Computed locals used across all modules
# =============================================================================

locals {
  # Canonical name prefix for every resource
  name_prefix = "${var.project_name}-${var.environment}"

  # Common tags merged on top of provider default_tags
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Region      = var.aws_region
    ManagedBy   = "terraform"
  }

  # Whether this is a production deployment (drives HA, deletion protection, etc.)
  is_production = var.environment == "prod"

  # RDS Multi-AZ only in production
  db_multi_az = local.is_production

  # Backup retention — longer in prod
  db_backup_retention = local.is_production ? 14 : var.db_backup_retention_days

  # EKS cluster name
  cluster_name = "${local.name_prefix}-cluster"

  # ECR repository name
  ecr_repo_name = "${var.project_name}/appointment-api"
}
