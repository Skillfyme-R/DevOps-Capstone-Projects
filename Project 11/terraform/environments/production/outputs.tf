output "eks_cluster_name" {
  value = aws_eks_cluster.pulsar.name
}

output "eks_cluster_endpoint" {
  value = aws_eks_cluster.pulsar.endpoint
}

output "db_endpoint" {
  value = module.database.db_endpoint
}

output "cache_primary_endpoint" {
  value = module.cache.cache_primary_endpoint
}
