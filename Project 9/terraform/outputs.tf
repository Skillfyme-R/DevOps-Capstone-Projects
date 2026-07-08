output "vpc_id" {
  description = "ID of the MediCart VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "eks_cluster_name" {
  description = "Name of the MediCart EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "API endpoint of the MediCart EKS cluster"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_ca_certificate" {
  description = "Base64-encoded cluster CA certificate"
  value       = module.eks.cluster_ca_certificate
  sensitive   = true
}

output "ecr_repository_url" {
  description = "ECR repository URL for MediCart container images"
  value       = module.ecr.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint for MediCart database"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "Name of the MediCart application S3 bucket"
  value       = module.s3_bucket.bucket_name
}

output "secretsmanager_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = module.secretsmanager.secret_arn
  sensitive   = true
}
