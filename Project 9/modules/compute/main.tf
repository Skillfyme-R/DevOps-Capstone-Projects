# =============================================================================
# MediNova — Compute Module
# EKS cluster, managed node group, ECR repository, cluster add-ons
# =============================================================================

# --- ECR Repository for appointment-api image ---
resource "aws_ecr_repository" "appointment_api" {
  name                 = "medinova/appointment-api"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.common_tags, {
    Name      = "medinova-appointment-api"
    Component = "container-registry"
  })
}

resource "aws_ecr_lifecycle_policy" "appointment_api" {
  repository = aws_ecr_repository.appointment_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 20 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod-", "v"]
          countType     = "imageCountMoreThan"
          countNumber   = 20
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = { type = "expire" }
      }
    ]
  })
}

# --- EKS Cluster ---
resource "aws_eks_cluster" "medinova" {
  name     = var.cluster_name
  role_arn = var.cluster_role_arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = []
  }

  # Full control plane logging for HIPAA audit
  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  tags = merge(var.common_tags, {
    Name      = var.cluster_name
    Component = "kubernetes"
  })
}

# --- EKS Managed Node Group ---
resource "aws_eks_node_group" "medinova_workers" {
  cluster_name    = aws_eks_cluster.medinova.name
  node_group_name = "${var.name_prefix}-worker-nodes"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_desired_count
    min_size     = var.node_min_count
    max_size     = var.node_max_count
  }

  update_config {
    max_unavailable = 1
  }

  # Node labels for workload targeting
  labels = {
    environment = var.environment
    workload    = "medinova-api"
    managed-by  = "terraform"
  }

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }

  tags = merge(var.common_tags, {
    Name      = "${var.name_prefix}-worker-nodes"
    Component = "compute"
  })

  depends_on = [aws_eks_cluster.medinova]
}

# --- EKS Add-ons ---

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.medinova.name
  addon_name   = "coredns"

  tags = var.common_tags

  depends_on = [aws_eks_node_group.medinova_workers]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.medinova.name
  addon_name   = "kube-proxy"

  tags = var.common_tags

  depends_on = [aws_eks_node_group.medinova_workers]
}

resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.medinova.name
  addon_name   = "vpc-cni"

  tags = var.common_tags

  depends_on = [aws_eks_node_group.medinova_workers]
}

resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.medinova.name
  addon_name   = "aws-ebs-csi-driver"

  tags = var.common_tags

  depends_on = [aws_eks_node_group.medinova_workers]
}
