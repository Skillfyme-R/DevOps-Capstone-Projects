output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_region" {
  description = "AWS region of the cluster"
  value       = var.region
}

output "ecr_repository_url" {
  description = "ECR repository URL for CartFlow images"
  value       = aws_ecr_repository.cartflow.repository_url
}

output "eks_admin_role_arn" {
  description = "ARN of the EKS admin IAM role"
  value       = aws_iam_role.eks_admin.arn
}

output "configure_kubectl" {
  description = "Command to configure kubectl for the CartFlow cluster"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${var.cluster_name}"
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "node_group_arn" {
  description = "EKS managed node group ARN"
  value       = module.eks.eks_managed_node_groups["main"].node_group_arn
}
