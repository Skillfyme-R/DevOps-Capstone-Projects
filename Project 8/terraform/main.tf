terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "cartflow-tfstate-prod"
    key    = "cartflow/eks/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Platform    = "CartFlow"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "platform-engineering"
    }
  }
}

# ──────────────────────────────────────────────
# VPC
# ──────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

# ──────────────────────────────────────────────
# KMS key for EKS secrets encryption
# ──────────────────────────────────────────────
resource "aws_kms_key" "eks" {
  description             = "KMS key for CartFlow EKS cluster secret encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "eks" {
  name          = "alias/eks/${var.cluster_name}"
  target_key_id = aws_kms_key.eks.key_id
}

# ──────────────────────────────────────────────
# EKS Cluster
# ──────────────────────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  eks_managed_node_groups = {
    main = {
      instance_types = [var.node_instance_type]
      min_size       = 1
      max_size       = 4
      desired_size   = var.node_count

      iam_role_additional_policies = {
        ssm        = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
        cloudwatch = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
      }

      labels = {
        role    = "worker"
        platform = "cartflow"
      }
    }
  }
}

# ──────────────────────────────────────────────
# IAM Role — EKS admin (assumed by Jenkins + CLI)
# ──────────────────────────────────────────────
resource "aws_iam_role" "eks_admin" {
  name = "cartflow-eks-admin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${var.aws_account_id}:user/${var.platform_admin_user}",
            "arn:aws:iam::${var.aws_account_id}:root"
          ]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_admin_cluster_policy" {
  role       = aws_iam_role.eks_admin.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_policy" "eks_describe" {
  name        = "cartflow-eks-describe-policy"
  description = "Allows describing EKS clusters — required for kubeconfig generation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["eks:DescribeCluster", "eks:ListClusters", "eks:ListNodegroups"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_describe" {
  role       = aws_iam_role.eks_admin.name
  policy_arn = aws_iam_policy.eks_describe.arn
}

# ──────────────────────────────────────────────
# EKS Access Entries (Kubernetes RBAC via IAM)
# ──────────────────────────────────────────────
resource "aws_eks_access_entry" "admin" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.eks_admin.arn
  type          = "STANDARD"

  depends_on = [module.eks]
}

resource "aws_eks_access_policy_association" "admin" {
  cluster_name  = module.eks.cluster_name
  principal_arn = aws_iam_role.eks_admin.arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin]
}

# ──────────────────────────────────────────────
# ECR Repository for CartFlow images
# ──────────────────────────────────────────────
resource "aws_ecr_repository" "cartflow" {
  name                 = var.platform_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.eks.arn
  }
}

resource "aws_ecr_lifecycle_policy" "cartflow" {
  repository = aws_ecr_repository.cartflow.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ──────────────────────────────────────────────
# CloudWatch Log Groups
# ──────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "cartflow_nodes" {
  name              = "/cartflow/nodes"
  retention_in_days = 90
}

resource "aws_cloudwatch_log_group" "cartflow_app" {
  name              = "/cartflow/application"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "cartflow_access" {
  name              = "/cartflow/access-logs"
  retention_in_days = 30
}
