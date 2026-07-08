resource "aws_eks_cluster" "main" {
  name     = "medicart-${var.environment}-cluster"
  role_arn = var.eks_cluster_role_arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = {
    Name        = "medicart-${var.environment}-cluster"
    Environment = var.environment
    Project     = "medicart-platform"
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "medicart-${var.environment}-nodes"
  node_role_arn   = var.eks_nodes_role_arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = [var.instance_type]

  scaling_config {
    desired_size = var.desired_capacity
    min_size     = var.min_capacity
    max_size     = var.max_capacity
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    environment = var.environment
    workload    = "medicart-api"
  }

  tags = {
    Name        = "medicart-${var.environment}-node-group"
    Environment = var.environment
  }

  depends_on = [aws_eks_cluster.main]
}

# Cluster add-ons
resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"

  tags = {
    Environment = var.environment
  }

  depends_on = [aws_eks_node_group.main]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"

  tags = {
    Environment = var.environment
  }

  depends_on = [aws_eks_node_group.main]
}

resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"

  tags = {
    Environment = var.environment
  }

  depends_on = [aws_eks_node_group.main]
}
