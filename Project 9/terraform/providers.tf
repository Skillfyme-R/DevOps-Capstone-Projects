terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Primary AWS provider — us-east-1 (HIPAA-eligible region)
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "medinova-platform"
      Company     = "MediNova Health Solutions"
      ManagedBy   = "terraform"
      Environment = var.environment
      CostCenter  = "healthcare-platform"
      Compliance  = "HIPAA"
    }
  }
}
