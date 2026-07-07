variable "gcp_project_id" {
  description = "GCP project ID for VaultFlow production infrastructure"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "api_image_tag" {
  description = "Docker image tag for the VaultFlow API"
  type        = string
  default     = "1.0.0"
}

variable "ui_image_tag" {
  description = "Docker image tag for the VaultFlow UI"
  type        = string
  default     = "1.0.0"
}

variable "jwt_secret" {
  description = "JWT signing secret (sensitive)"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Primary database connection string (sensitive)"
  type        = string
  sensitive   = true
}
