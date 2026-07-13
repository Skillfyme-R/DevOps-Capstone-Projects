terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # State bucket must exist and have versioning enabled before first `terraform init` here.
  backend "s3" {
    bucket         = "reelforge-pulsar-tfstate"
    key            = "environments/production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "reelforge-pulsar-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.pulsar_aws_region

  default_tags {
    tags = {
      Product     = "pulsar"
      Environment = var.pulsar_environment
      ManagedBy   = "terraform"
    }
  }
}

module "networking" {
  source = "../../modules/networking"

  pulsar_environment = var.pulsar_environment
  pulsar_vpc_cidr    = var.pulsar_vpc_cidr
}

module "database" {
  source = "../../modules/database"

  pulsar_environment          = var.pulsar_environment
  pulsar_vpc_id               = module.networking.vpc_id
  pulsar_db_subnet_ids        = module.networking.private_subnet_ids
  pulsar_db_security_group_id = module.networking.database_security_group_id
  pulsar_db_instance_class    = var.pulsar_db_instance_class
  pulsar_db_multi_az          = var.pulsar_db_multi_az
  pulsar_db_password          = var.pulsar_db_password
}

module "cache" {
  source = "../../modules/cache"

  pulsar_environment             = var.pulsar_environment
  pulsar_cache_subnet_ids        = module.networking.private_subnet_ids
  pulsar_cache_security_group_id = module.networking.cache_security_group_id
  pulsar_cache_node_type         = var.pulsar_cache_node_type
}

resource "aws_iam_role" "eks_cluster" {
  name = "pulsar-${var.pulsar_environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "pulsar" {
  name     = "pulsar-${var.pulsar_environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.pulsar_eks_cluster_version

  vpc_config {
    subnet_ids              = concat(module.networking.private_subnet_ids, module.networking.public_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]

  tags = {
    Name = "pulsar-${var.pulsar_environment}-eks"
  }
}

resource "aws_iam_role" "eks_node_group" {
  name = "pulsar-${var.pulsar_environment}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  role       = aws_iam_role.eks_node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_ecr_read_only" {
  role       = aws_iam_role.eks_node_group.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_eks_node_group" "pulsar" {
  cluster_name    = aws_eks_cluster.pulsar.name
  node_group_name = "pulsar-${var.pulsar_environment}-nodes"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = module.networking.private_subnet_ids
  instance_types  = var.pulsar_eks_node_instance_types

  scaling_config {
    desired_size = var.pulsar_eks_node_desired_size
    min_size     = var.pulsar_eks_node_min_size
    max_size     = var.pulsar_eks_node_max_size
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_ecr_read_only,
  ]

  tags = {
    Name = "pulsar-${var.pulsar_environment}-eks-nodes"
  }
}
