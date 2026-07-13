variable "pulsar_environment" {
  description = "Deployment environment name (e.g. staging, production)"
  type        = string
}

variable "pulsar_cache_subnet_ids" {
  description = "Private subnet IDs for the ElastiCache subnet group"
  type        = list(string)
}

variable "pulsar_cache_security_group_id" {
  description = "Security group ID allowing Redis ingress from Pulsar server"
  type        = string
}

variable "pulsar_cache_node_type" {
  description = "ElastiCache node type — cache.t4g.medium covers Pulsar's task-lease/queue caching without a dedicated cluster tier"
  type        = string
  default     = "cache.t4g.medium"
}

variable "pulsar_cache_num_nodes" {
  description = "Number of cache nodes in the replication group"
  type        = number
  default     = 1
}
