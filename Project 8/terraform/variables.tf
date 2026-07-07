variable "region" {
  description = "AWS region where CartFlow infrastructure is deployed"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Name of the EKS cluster for CartFlow"
  type        = string
  default     = "cartflow-prod"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.31"
}

variable "node_instance_type" {
  description = "EC2 instance type for EKS worker nodes"
  type        = string
  default     = "t3.small"
}

variable "node_count" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "aws_account_id" {
  description = "AWS Account ID for CartFlow"
  type        = string
}

variable "platform_admin_user" {
  description = "IAM user that can assume the EKS admin role (e.g. cartflow-ci)"
  type        = string
  default     = "cartflow-ci"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "platform_name" {
  description = "CartFlow platform identifier used in resource tags"
  type        = string
  default     = "cartflow"
}
