# =============================================================================
# MediNova — Security Module
# IAM roles, Security Groups, KMS key, WAF v2
# =============================================================================

# --- KMS Key for HIPAA-aligned encryption ---
resource "aws_kms_key" "medinova" {
  description             = "MediNova HIPAA encryption key — ${var.environment}"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
        Action = [
          "kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name       = "${var.name_prefix}-kms-key"
    Compliance = "HIPAA"
  })
}

resource "aws_kms_alias" "medinova" {
  name          = "alias/medinova-${var.environment}"
  target_key_id = aws_kms_key.medinova.key_id
}

data "aws_caller_identity" "current" {}

# --- Security Group: EKS Cluster Control Plane ---
resource "aws_security_group" "eks_cluster" {
  name        = "${var.name_prefix}-eks-cluster-sg"
  description = "MediNova EKS cluster control plane communication"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-eks-cluster-sg"
  })
}

# --- Security Group: EKS Worker Nodes ---
resource "aws_security_group" "eks_nodes" {
  name        = "${var.name_prefix}-eks-nodes-sg"
  description = "MediNova EKS worker node security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    self            = true
    description     = "Allow node-to-node communication"
  }

  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
    description     = "Allow cluster control plane to nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-eks-nodes-sg"
  })
}

# --- Security Group: RDS Patient Database ---
resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "MediNova patient database — allow PostgreSQL from EKS nodes only"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
    description     = "PostgreSQL from EKS worker nodes"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(var.common_tags, {
    Name       = "${var.name_prefix}-rds-sg"
    Compliance = "HIPAA"
  })
}

# --- IAM Role: EKS Cluster ---
resource "aws_iam_role" "eks_cluster" {
  name = "${var.name_prefix}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-eks-cluster-role"
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# --- IAM Role: EKS Worker Nodes ---
resource "aws_iam_role" "eks_nodes" {
  name = "${var.name_prefix}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-eks-node-role"
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# --- Custom policy: Secrets Manager access for patient data secrets ---
resource "aws_iam_policy" "secrets_access" {
  name        = "${var.name_prefix}-secrets-access"
  description = "Allow MediNova pods to read secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = "arn:aws:secretsmanager:*:*:secret:medinova/${var.environment}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = aws_kms_key.medinova.arn
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "secrets_access" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

# --- IAM Role: CI/CD via GitHub Actions OIDC ---
resource "aws_iam_role" "cicd_role" {
  name = "${var.name_prefix}-cicd-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:medinova-health/*:*"
        }
      }
    }]
  })

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-cicd-role"
  })
}

resource "aws_iam_role_policy_attachment" "cicd_ecr" {
  role       = aws_iam_role.cicd_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

# --- WAF v2 — HIPAA-aligned web application firewall ---
resource "aws_wafv2_web_acl" "medinova" {
  name        = "${var.name_prefix}-waf"
  description = "MediNova Healthcare Platform WAF — OWASP protections + rate limiting"
  scope       = "REGIONAL"

  default_action { allow {} }

  # OWASP Common Rule Set
  rule {
    name     = "MediNovaCommonRules"
    priority = 10
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "MediNovaCommonRules"
      sampled_requests_enabled   = true
    }
  }

  # Known bad inputs (SQL injection, XSS)
  rule {
    name     = "MediNovaKnownBadInputs"
    priority = 20
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "MediNovaKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Rate limit — 1000 requests per 5 minutes per IP
  rule {
    name     = "MediNovaRateLimit"
    priority = 30
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "MediNovaRateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name_prefix}-waf"
    sampled_requests_enabled   = true
  }

  tags = merge(var.common_tags, {
    Name       = "${var.name_prefix}-waf"
    Compliance = "HIPAA"
  })
}
