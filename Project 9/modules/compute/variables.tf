variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "cluster_name" { type = string }
variable "kubernetes_version" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "node_instance_type" { type = string }
variable "node_desired_count" { type = number }
variable "node_min_count" { type = number }
variable "node_max_count" { type = number }
variable "cluster_role_arn" { type = string }
variable "node_role_arn" { type = string }
variable "common_tags" { type = map(string); default = {} }
