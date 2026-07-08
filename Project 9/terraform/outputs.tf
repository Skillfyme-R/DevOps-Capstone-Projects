# =============================================================================
# MediNova — Root Outputs
# =============================================================================

# --- Networking ---
output "vpc_id" {
  description = "ID of the MediNova VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public-facing subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private application subnets"
  value       = module.networking.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the isolated database subnets"
  value       = module.networking.database_subnet_ids
}

# --- Compute ---
output "eks_cluster_name" {
  description = "Name of the MediNova EKS cluster"
  value       = module.compute.cluster_name
}

output "eks_cluster_endpoint" {
  description = "API server endpoint of the EKS cluster"
  value       = module.compute.cluster_endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL for the appointment API image"
  value       = module.compute.ecr_repository_url
}

# --- Database ---
output "rds_endpoint" {
  description = "Connection endpoint for the MediNova patient database"
  value       = module.database.db_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "PostgreSQL port"
  value       = module.database.db_port
}

# --- Storage ---
output "patient_records_bucket_name" {
  description = "S3 bucket storing encrypted patient records"
  value       = module.storage.patient_records_bucket_name
}

output "app_assets_bucket_name" {
  description = "S3 bucket for application assets"
  value       = module.storage.app_assets_bucket_name
}

# --- Monitoring ---
output "cloudwatch_dashboard_url" {
  description = "CloudWatch Operations Dashboard URL"
  value       = module.monitoring.dashboard_url
}

output "sns_alert_topic_arn" {
  description = "ARN of the SNS topic receiving CloudWatch alerts"
  value       = module.monitoring.alert_topic_arn
}
