variable "environment" { type = string }
variable "db_username" { type = string }
variable "db_password" { type = string; sensitive = true }
variable "db_endpoint" { type = string; sensitive = true }
variable "db_name" { type = string }
