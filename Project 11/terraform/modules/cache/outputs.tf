output "cache_primary_endpoint" {
  value = aws_elasticache_replication_group.pulsar.primary_endpoint_address
}

output "cache_port" {
  value = aws_elasticache_replication_group.pulsar.port
}
