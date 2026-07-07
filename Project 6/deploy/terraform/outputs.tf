output "vpc_id" {
  description = "ID of the NexaFlow VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = local.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "PostgreSQL endpoint (host:port)"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint (host:port)"
  value       = module.elasticache.endpoint
  sensitive   = true
}

output "s3_bucket_documents" {
  description = "S3 bucket for document storage"
  value       = module.s3.bucket_names["documents"]
}

output "app_url" {
  description = "NexaFlow application URL"
  value       = "https://${var.app_domain}"
}
