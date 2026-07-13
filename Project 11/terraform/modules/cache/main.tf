locals {
  name_prefix = "pulsar-${var.pulsar_environment}"
}

resource "aws_elasticache_subnet_group" "pulsar" {
  name       = "${local.name_prefix}-cache-subnet-group"
  subnet_ids = var.pulsar_cache_subnet_ids
}

resource "aws_elasticache_replication_group" "pulsar" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Pulsar task-lease/queue cache — Redis 7"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = var.pulsar_cache_node_type
  port           = 6379

  num_cache_clusters = var.pulsar_cache_num_nodes

  subnet_group_name  = aws_elasticache_subnet_group.pulsar.name
  security_group_ids = [var.pulsar_cache_security_group_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name    = "${local.name_prefix}-redis"
    Product = "pulsar"
  }
}
