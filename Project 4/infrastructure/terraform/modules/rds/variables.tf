variable "environment"                { type = string }
variable "vpc_id"                      { type = string }
variable "private_subnet_ids"          { type = list(string) }
variable "allowed_security_group_ids"  { type = list(string) }
variable "kms_key_arn"                 { type = string }
variable "master_password"             { type = string; sensitive = true }
variable "instance_class"             { type = string; default = "db.t4g.medium" }
variable "allocated_storage_gb"        { type = number; default = 50 }
variable "max_storage_gb"              { type = number; default = 500 }
variable "multi_az"                    { type = bool; default = true }
variable "deletion_protection"         { type = bool; default = true }
variable "backup_retention_days"       { type = number; default = 14 }
variable "monitoring_role_arn"         { type = string }
variable "tags"                        { type = map(string); default = {} }
