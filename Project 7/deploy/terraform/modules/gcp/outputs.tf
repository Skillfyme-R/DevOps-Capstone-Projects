output "cluster_endpoint" {
  description = "GKE cluster API endpoint"
  value       = "https://${google_container_cluster.vaultflow.endpoint}"
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate (base64)"
  value       = google_container_cluster.vaultflow.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.vaultflow.name
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.vaultflow.connection_name
}

output "redis_host" {
  description = "Cloud Memorystore Redis host"
  value       = google_redis_instance.vaultflow.host
  sensitive   = true
}

output "vpc_id" {
  description = "VPC network ID"
  value       = google_compute_network.vaultflow.id
}
