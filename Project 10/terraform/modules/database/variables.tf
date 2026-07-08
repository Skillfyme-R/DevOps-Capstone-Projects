variable "project_name"        { type = string }
variable "private_subnet_ids"  { type = list(string) }
variable "security_group_id"   { type = string }
variable "kms_key_arn"         { type = string; default = null }
variable "db_name"             { type = string; default = "deploypilot" }
variable "db_username"         { type = string; default = "deploypilot" }
variable "db_password"         { type = string; sensitive = true }
variable "instance_class"      { type = string; default = "db.t3.medium" }
variable "allocated_storage"   { type = number; default = 50 }
variable "max_allocated_storage" { type = number; default = 200 }
variable "multi_az"            { type = bool; default = true }
variable "deletion_protection" { type = bool; default = true }
variable "backup_retention_days" { type = number; default = 14 }
variable "tags"                { type = map(string); default = {} }
