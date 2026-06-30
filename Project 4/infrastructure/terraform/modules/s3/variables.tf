variable "environment"  { type = string }
variable "account_id"   { type = string }
variable "kms_key_arn"  { type = string }
variable "tags"         { type = map(string); default = {} }
