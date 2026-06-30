variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AZs to spread subnets across"
}

variable "flow_log_role_arn" {
  type        = string
  description = "IAM role ARN for VPC flow log delivery"
}

variable "flow_log_bucket_arn" {
  type        = string
  description = "S3 bucket ARN for VPC flow log storage"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Common tags applied to all resources"
}
