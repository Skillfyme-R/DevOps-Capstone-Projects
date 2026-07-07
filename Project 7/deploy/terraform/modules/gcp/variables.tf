variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
}

variable "environment" {
  description = "Deployment environment: production | staging | development"
  type        = string
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "environment must be production, staging, or development"
  }
}

variable "node_pool_config" {
  description = "GKE node pool sizing configuration"
  type = object({
    initial_count = number
    min_count     = number
    max_count     = number
    machine_type  = string
    disk_size_gb  = number
  })
  default = {
    initial_count = 2
    min_count     = 1
    max_count     = 5
    machine_type  = "e2-standard-2"
    disk_size_gb  = 50
  }
}
