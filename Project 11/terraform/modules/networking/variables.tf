variable "pulsar_environment" {
  description = "Deployment environment name (e.g. staging, production)"
  type        = string
}

variable "pulsar_vpc_cidr" {
  description = "CIDR block for the Pulsar VPC"
  type        = string
  default     = "10.30.0.0/16"
}

variable "pulsar_availability_zones" {
  description = "Availability zones to spread subnets across"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "pulsar_public_subnet_cidrs" {
  description = "CIDR blocks for public subnets, one per AZ"
  type        = list(string)
  default     = ["10.30.0.0/24", "10.30.1.0/24", "10.30.2.0/24"]
}

variable "pulsar_private_subnet_cidrs" {
  description = "CIDR blocks for private subnets, one per AZ"
  type        = list(string)
  default     = ["10.30.10.0/24", "10.30.11.0/24", "10.30.12.0/24"]
}
