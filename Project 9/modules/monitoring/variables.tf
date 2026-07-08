variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "cluster_name" { type = string }
variable "alert_email" { type = string }
variable "log_retention_days" { type = number; default = 90 }
variable "common_tags" { type = map(string); default = {} }
