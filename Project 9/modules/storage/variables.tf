variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "patient_records_bucket" { type = string }
variable "app_assets_bucket" { type = string }
variable "log_retention_days" { type = number; default = 90 }
variable "common_tags" { type = map(string); default = {} }
