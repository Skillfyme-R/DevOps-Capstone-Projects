terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# ── VPC Network ───────────────────────────────────────────────────────────────
resource "google_compute_network" "vaultflow" {
  name                    = "vaultflow-${var.environment}-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "vaultflow" {
  name          = "vaultflow-${var.environment}-subnet"
  ip_cidr_range = "10.100.0.0/20"
  region        = var.region
  network       = google_compute_network.vaultflow.id
  project       = var.project_id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.200.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.201.0.0/20"
  }

  private_ip_google_access = true
}

# ── GKE Cluster ───────────────────────────────────────────────────────────────
resource "google_container_cluster" "vaultflow" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vaultflow.id
  subnetwork = google_compute_subnetwork.vaultflow.id

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.32/28"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  addons_config {
    http_load_balancing { disabled = false }
    horizontal_pod_autoscaling { disabled = false }
  }

  release_channel {
    channel = "REGULAR"
  }

  logging_service    = "logging.googleapis.com/kubernetes"
  monitoring_service = "monitoring.googleapis.com/kubernetes"

  resource_labels = {
    platform    = "vaultflow"
    environment = var.environment
    managed-by  = "terraform"
  }
}

resource "google_container_node_pool" "vaultflow_nodes" {
  name       = "vaultflow-${var.environment}-nodes"
  cluster    = google_container_cluster.vaultflow.name
  location   = var.region
  project    = var.project_id

  initial_node_count = var.node_pool_config.initial_count

  autoscaling {
    min_node_count = var.node_pool_config.min_count
    max_node_count = var.node_pool_config.max_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.node_pool_config.machine_type
    disk_size_gb = var.node_pool_config.disk_size_gb
    disk_type    = "pd-ssd"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      platform    = "vaultflow"
      environment = var.environment
    }
  }
}

# ── Cloud SQL (PostgreSQL) ─────────────────────────────────────────────────────
resource "google_sql_database_instance" "vaultflow" {
  name             = "vaultflow-${var.environment}-pg"
  database_version = "POSTGRES_16"
  region           = var.region
  project          = var.project_id

  deletion_protection = var.environment == "production"

  settings {
    tier              = var.environment == "production" ? "db-custom-4-15360" : "db-f1-micro"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vaultflow.id
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
  }
}

resource "google_sql_database" "vaultflow" {
  name     = "vaultflow"
  instance = google_sql_database_instance.vaultflow.name
  project  = var.project_id
}

# ── Cloud Memorystore (Redis) ──────────────────────────────────────────────────
resource "google_redis_instance" "vaultflow" {
  name           = "vaultflow-${var.environment}-cache"
  memory_size_gb = var.environment == "production" ? 4 : 1
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"
  region         = var.region
  project        = var.project_id

  authorized_network = google_compute_network.vaultflow.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version   = "REDIS_7_0"
  display_name    = "VaultFlow Cache (${var.environment})"

  labels = {
    platform    = "vaultflow"
    environment = var.environment
  }
}
