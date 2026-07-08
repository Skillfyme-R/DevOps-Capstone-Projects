# =============================================================================
# MediNova Health Solutions — Root Terraform Variables
# =============================================================================

# --- Core ---

variable "environment" {
  type        = string
  description = "Deployment environment identifier"
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region — must be a HIPAA-eligible region"
  default     = "us-east-1"

  validation {
    condition     = contains(["us-east-1", "us-east-2", "us-west-2"], var.aws_region)
    error_message = "aws_region must be a HIPAA-eligible region: us-east-1, us-east-2, or us-west-2."
  }
}

variable "project_name" {
  type        = string
  description = "Short project identifier used in all resource names"
  default     = "medinova"
}

# --- Networking ---

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the MediNova VPC"
  default     = "10.10.0.0/16"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr must be a valid CIDR block."
  }
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets — one per AZ"
  default     = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private application subnets — one per AZ"
  default     = ["10.10.10.0/24", "10.10.11.0/24", "10.10.12.0/24"]
}

variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for isolated database subnets — one per AZ"
  default     = ["10.10.20.0/24", "10.10.21.0/24", "10.10.22.0/24"]
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability zones to distribute resources across"
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "enable_vpc_flow_logs" {
  type        = bool
  description = "Enable VPC flow logs for network audit trail"
  default     = true
}

# --- Compute (EKS) ---

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster"
  default     = "1.31"
}

variable "node_instance_type" {
  type        = string
  description = "EC2 instance type for EKS worker nodes"
  default     = "t3.medium"
}

variable "node_desired_count" {
  type        = number
  description = "Desired number of EKS worker nodes"
  default     = 2

  validation {
    condition     = var.node_desired_count >= 1
    error_message = "node_desired_count must be at least 1."
  }
}

variable "node_min_count" {
  type        = number
  description = "Minimum number of EKS worker nodes"
  default     = 1
}

variable "node_max_count" {
  type        = number
  description = "Maximum number of EKS worker nodes"
  default     = 6
}

# --- Database (RDS) ---

variable "db_instance_class" {
  type        = string
  description = "RDS instance class for the patient database"
  default     = "db.t3.small"
}

variable "db_name" {
  type        = string
  description = "PostgreSQL database name"
  default     = "medinova_db"
}

variable "db_master_username" {
  type        = string
  description = "Master username for the RDS instance"
  default     = "medinova_admin"
}

variable "db_master_password" {
  type        = string
  description = "Master password — use AWS Secrets Manager in production"
  sensitive   = true
}

variable "db_allocated_storage_gb" {
  type        = number
  description = "Allocated storage for RDS in GiB"
  default     = 50
}

variable "db_backup_retention_days" {
  type        = number
  description = "Number of days to retain automated RDS backups"
  default     = 7
}

# --- Storage ---

variable "patient_records_bucket" {
  type        = string
  description = "S3 bucket name for encrypted patient records and documents"
}

variable "app_assets_bucket" {
  type        = string
  description = "S3 bucket name for application static assets"
}

# --- Monitoring ---

variable "alert_email" {
  type        = string
  description = "Email address for CloudWatch alarm notifications"
  default     = "ops@medinova.health"
}

variable "log_retention_days" {
  type        = number
  description = "Number of days to retain CloudWatch logs"
  default     = 90
}
