variable "environment" { type = string }
variable "instance_class" { type = string }
variable "allocated_storage" { type = number; default = 50 }
variable "db_name" { type = string }
variable "db_username" { type = string }
variable "db_password" { type = string; sensitive = true }
variable "private_subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
