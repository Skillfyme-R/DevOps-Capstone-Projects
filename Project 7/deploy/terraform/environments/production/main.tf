terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  backend "gcs" {
    bucket = "vaultflow-terraform-state-prod"
    prefix = "production"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "kubernetes" {
  host                   = module.gke.cluster_endpoint
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
  token                  = data.google_client_config.default.access_token
}

provider "helm" {
  kubernetes {
    host                   = module.gke.cluster_endpoint
    cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
    token                  = data.google_client_config.default.access_token
  }
}

data "google_client_config" "default" {}

# ── GKE Cluster ───────────────────────────────────────────────────────────────
module "gke" {
  source = "../../modules/gcp"

  project_id   = var.gcp_project_id
  region       = var.gcp_region
  cluster_name = "vaultflow-prod"
  environment  = "production"

  node_pool_config = {
    initial_count = 3
    min_count     = 2
    max_count     = 10
    machine_type  = "e2-standard-4"
    disk_size_gb  = 100
  }
}

# ── VaultFlow Helm Release ─────────────────────────────────────────────────────
resource "helm_release" "vaultflow" {
  name             = "vaultflow"
  chart            = "${path.root}/../../../../deploy/helm/vaultflow"
  namespace        = "vaultflow"
  create_namespace = true
  atomic           = true
  timeout          = 600

  values = [
    file("${path.root}/values.yaml"),
  ]

  set {
    name  = "api.image.tag"
    value = var.api_image_tag
  }

  set {
    name  = "ui.image.tag"
    value = var.ui_image_tag
  }

  set_sensitive {
    name  = "api.secrets.jwtSecret"
    value = var.jwt_secret
  }

  set_sensitive {
    name  = "api.secrets.databaseUrl"
    value = var.database_url
  }

  depends_on = [module.gke]
}
