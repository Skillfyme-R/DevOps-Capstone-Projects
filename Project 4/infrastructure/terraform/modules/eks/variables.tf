variable "environment"            { type = string }
variable "kubernetes_version"     { type = string; default = "1.30" }
variable "private_subnet_ids"     { type = list(string) }
variable "kms_key_arn"            { type = string }
variable "public_endpoint_enabled" { type = bool; default = false }
variable "public_access_cidrs"    { type = list(string); default = [] }
variable "node_instance_types"    { type = list(string); default = ["m5.large"] }
variable "use_spot"               { type = bool; default = false }
variable "node_desired"           { type = number; default = 2 }
variable "node_min"               { type = number; default = 1 }
variable "node_max"               { type = number; default = 10 }
variable "tags"                   { type = map(string); default = {} }
