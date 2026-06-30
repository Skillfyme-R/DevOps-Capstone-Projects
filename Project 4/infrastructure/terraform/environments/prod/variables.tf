variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "db_master_password" {
  type      = string
  sensitive = true
  description = "RDS master password — inject via TF_VAR_db_master_password or Secrets Manager"
}
