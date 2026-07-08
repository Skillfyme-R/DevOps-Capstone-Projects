output "cluster_name" { value = aws_eks_cluster.medinova.name }
output "cluster_endpoint" { value = aws_eks_cluster.medinova.endpoint }
output "cluster_ca_certificate" {
  value     = aws_eks_cluster.medinova.certificate_authority[0].data
  sensitive = true
}
output "ecr_repository_url" { value = aws_ecr_repository.appointment_api.repository_url }
output "ecr_repository_arn" { value = aws_ecr_repository.appointment_api.arn }
output "node_group_name" { value = aws_eks_node_group.medinova_workers.node_group_name }
