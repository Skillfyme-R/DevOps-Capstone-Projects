variable "pulsar_environment" {
  description = "Deployment environment name (e.g. staging, production)"
  type        = string
}

variable "pulsar_vpc_id" {
  description = "VPC ID to launch the RDS instance into"
  type        = string
}

variable "pulsar_db_subnet_ids" {
  description = "Private subnet IDs for the RDS subnet group"
  type        = list(string)
}

variable "pulsar_db_security_group_id" {
  description = "Security group ID allowing Postgres ingress from Pulsar server"
  type        = string
}

variable "pulsar_db_instance_class" {
  description = "RDS instance class — db.r6g.large sized for steady workflow-execution write load without over-provisioning"
  type        = string
  default     = "db.r6g.large"
}

variable "pulsar_db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

variable "pulsar_db_name" {
  description = "Database name"
  type        = string
  default     = "pulsar"
}

variable "pulsar_db_username" {
  description = "Master username"
  type        = string
  default     = "pulsar"
}

variable "pulsar_db_password" {
  description = "Master password — inject via TF_VAR_pulsar_db_password or a secrets manager, never commit a real value"
  type        = string
  sensitive   = true
}

variable "pulsar_db_multi_az" {
  description = "Enable Multi-AZ standby for production HA"
  type        = bool
  default     = false
}

variable "pulsar_db_backup_retention_days" {
  description = "Automated backup retention window"
  type        = number
  default     = 7
}
