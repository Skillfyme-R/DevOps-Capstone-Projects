variable "environment" {
  type        = string
  description = "Deployment environment (dev | staging | prod)"
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for all MediCart resources"
  default     = "us-east-1"
}

# ---- Networking ----

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the MediCart VPC"
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  type        = list(string)
  description = "CIDR blocks for public subnets (one per AZ)"
}

variable "private_subnets" {
  type        = list(string)
  description = "CIDR blocks for private subnets (one per AZ)"
}

variable "availability_zones" {
  type        = list(string)
  description = "AWS Availability Zones to deploy across"
}

# ---- Storage ----

variable "bucket_name" {
  type        = string
  description = "Name of the MediCart application S3 bucket"
}

variable "tfstate_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for Terraform remote state"
  default     = "medicart-tfstate"
}

# ---- EKS ----

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster"
  default     = "1.31"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for EKS worker nodes"
  default     = "t3.medium"
}

variable "desired_capacity" {
  type        = number
  description = "Desired number of EKS worker nodes"
  default     = 2
}

variable "min_capacity" {
  type        = number
  description = "Minimum number of EKS worker nodes"
  default     = 1
}

variable "max_capacity" {
  type        = number
  description = "Maximum number of EKS worker nodes"
  default     = 6
}

# ---- RDS ----

variable "db_name" {
  type        = string
  description = "PostgreSQL database name for MediCart"
  default     = "medicartdb"
}

variable "db_username" {
  type        = string
  description = "Master database username"
  default     = "medicartadmin"
}

variable "db_password" {
  type        = string
  description = "Master database password (use Secrets Manager in production)"
  sensitive   = true
}

variable "rds_instance" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.small"
}

variable "rds_allocated_storage" {
  type        = number
  description = "Allocated storage for RDS in GiB"
  default     = 50
}
