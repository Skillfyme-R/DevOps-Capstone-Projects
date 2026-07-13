variable "pulsar_environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "pulsar_aws_region" {
  description = "AWS region for the Pulsar production stack"
  type        = string
  default     = "us-east-1"
}

variable "pulsar_vpc_cidr" {
  description = "CIDR block for the Pulsar VPC"
  type        = string
  default     = "10.30.0.0/16"
}

variable "pulsar_eks_cluster_version" {
  description = "Kubernetes version for the EKS control plane"
  type        = string
  default     = "1.30"
}

variable "pulsar_eks_node_instance_types" {
  description = "Instance types for the EKS managed node group"
  type        = list(string)
  default     = ["m6i.large"]
}

variable "pulsar_eks_node_desired_size" {
  description = "Desired node count for the EKS managed node group"
  type        = number
  default     = 3
}

variable "pulsar_eks_node_min_size" {
  description = "Minimum node count for the EKS managed node group"
  type        = number
  default     = 2
}

variable "pulsar_eks_node_max_size" {
  description = "Maximum node count for the EKS managed node group"
  type        = number
  default     = 6
}

variable "pulsar_db_instance_class" {
  description = "RDS instance class for production"
  type        = string
  default     = "db.r6g.large"
}

variable "pulsar_db_multi_az" {
  description = "Enable Multi-AZ RDS standby in production"
  type        = bool
  default     = true
}

variable "pulsar_db_password" {
  description = "RDS master password — set via TF_VAR_pulsar_db_password from a secrets manager, never hardcode"
  type        = string
  sensitive   = true
}

variable "pulsar_cache_node_type" {
  description = "ElastiCache node type for production"
  type        = string
  default     = "cache.t4g.medium"
}
