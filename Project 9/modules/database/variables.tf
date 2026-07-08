variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "database_subnet_ids" { type = list(string) }
variable "db_instance_class" { type = string }
variable "db_name" { type = string }
variable "db_master_username" { type = string }
variable "db_master_password" { type = string; sensitive = true }
variable "allocated_storage_gb" { type = number; default = 50 }
variable "backup_retention" { type = number; default = 7 }
variable "multi_az" { type = bool; default = false }
variable "db_security_group_id" { type = string }
variable "common_tags" { type = map(string); default = {} }
