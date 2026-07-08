output "eks_cluster_role_arn" { value = aws_iam_role.eks_cluster.arn }
output "eks_nodes_role_arn" { value = aws_iam_role.eks_nodes.arn }
output "cicd_deploy_role_arn" { value = aws_iam_role.cicd_deploy.arn }
