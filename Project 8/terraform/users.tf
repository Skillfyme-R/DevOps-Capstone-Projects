locals {
  platform_engineers = [
    "pe-sarah",
    "pe-daniel",
    "pe-priya",
    "pe-marcus",
    "pe-lena",
    "pe-chen",
    "pe-tobias",
  ]

  commerce_developers = [
    "dev-alice",
    "dev-raj",
    "dev-omar",
    "dev-yuki",
  ]

  security_analysts = [
    "sec-victor",
    "sec-diana",
    "sec-kwame",
  ]

  observability_engineers = [
    "obs-nina",
    "obs-felix",
    "obs-grace",
  ]

  data_engineers = [
    "data-hugo",
    "data-leila",
    "data-sam",
  ]
}

# ──────────────────────────────────────────────
# IAM Users
# ──────────────────────────────────────────────
resource "aws_iam_user" "platform_engineers" {
  for_each      = toset(local.platform_engineers)
  name          = each.value
  force_destroy = true

  tags = {
    team     = "platform-engineering"
    platform = "cartflow"
  }
}

resource "aws_iam_user" "commerce_developers" {
  for_each      = toset(local.commerce_developers)
  name          = each.value
  force_destroy = true

  tags = {
    team     = "commerce-development"
    platform = "cartflow"
  }
}

resource "aws_iam_user" "security_analysts" {
  for_each      = toset(local.security_analysts)
  name          = each.value
  force_destroy = true

  tags = {
    team     = "security"
    platform = "cartflow"
  }
}

resource "aws_iam_user" "observability_engineers" {
  for_each      = toset(local.observability_engineers)
  name          = each.value
  force_destroy = true

  tags = {
    team     = "observability"
    platform = "cartflow"
  }
}

resource "aws_iam_user" "data_engineers" {
  for_each      = toset(local.data_engineers)
  name          = each.value
  force_destroy = true

  tags = {
    team     = "data-engineering"
    platform = "cartflow"
  }
}

# ──────────────────────────────────────────────
# IAM Groups
# ──────────────────────────────────────────────
resource "aws_iam_group" "platform_engineering" {
  name = "platform-engineering"
}

resource "aws_iam_group" "commerce_developers" {
  name = "commerce-developers"
}

resource "aws_iam_group" "security_team" {
  name = "security-team"
}

resource "aws_iam_group" "observability_team" {
  name = "observability-team"
}

resource "aws_iam_group" "data_team" {
  name = "data-team"
}

# ──────────────────────────────────────────────
# Group Memberships
# ──────────────────────────────────────────────
resource "aws_iam_group_membership" "platform_engineering" {
  name  = "platform-engineering-membership"
  group = aws_iam_group.platform_engineering.name
  users = local.platform_engineers

  depends_on = [aws_iam_user.platform_engineers]
}

resource "aws_iam_group_membership" "commerce_developers" {
  name  = "commerce-developers-membership"
  group = aws_iam_group.commerce_developers.name
  users = local.commerce_developers

  depends_on = [aws_iam_user.commerce_developers]
}

resource "aws_iam_group_membership" "security_team" {
  name  = "security-team-membership"
  group = aws_iam_group.security_team.name
  users = local.security_analysts

  depends_on = [aws_iam_user.security_analysts]
}

resource "aws_iam_group_membership" "observability_team" {
  name  = "observability-team-membership"
  group = aws_iam_group.observability_team.name
  users = local.observability_engineers

  depends_on = [aws_iam_user.observability_engineers]
}

resource "aws_iam_group_membership" "data_team" {
  name  = "data-team-membership"
  group = aws_iam_group.data_team.name
  users = local.data_engineers

  depends_on = [aws_iam_user.data_engineers]
}

# ──────────────────────────────────────────────
# Platform Engineering Policies
# ──────────────────────────────────────────────
resource "aws_iam_group_policy_attachment" "pe_eks" {
  group      = aws_iam_group.platform_engineering.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_group_policy_attachment" "pe_ecr" {
  group      = aws_iam_group.platform_engineering.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
}

resource "aws_iam_group_policy_attachment" "pe_cloudwatch" {
  group      = aws_iam_group.platform_engineering.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
}

# ──────────────────────────────────────────────
# Commerce Developer Policies
# ──────────────────────────────────────────────
resource "aws_iam_group_policy_attachment" "dev_ecr" {
  group      = aws_iam_group.commerce_developers.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_group_policy_attachment" "dev_cw_logs" {
  group      = aws_iam_group.commerce_developers.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsReadOnlyAccess"
}

# ──────────────────────────────────────────────
# Security Team Policies
# ──────────────────────────────────────────────
resource "aws_iam_group_policy_attachment" "sec_iam_read" {
  group      = aws_iam_group.security_team.name
  policy_arn = "arn:aws:iam::aws:policy/IAMReadOnlyAccess"
}

resource "aws_iam_group_policy_attachment" "sec_cloudtrail" {
  group      = aws_iam_group.security_team.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCloudTrail_ReadOnlyAccess"
}

# ──────────────────────────────────────────────
# Observability Team Policies
# ──────────────────────────────────────────────
resource "aws_iam_group_policy_attachment" "obs_cloudwatch" {
  group      = aws_iam_group.observability_team.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
}

resource "aws_iam_group_policy_attachment" "obs_xray" {
  group      = aws_iam_group.observability_team.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayReadOnlyAccess"
}

# ──────────────────────────────────────────────
# Data Engineering Policies
# ──────────────────────────────────────────────
resource "aws_iam_group_policy_attachment" "data_s3" {
  group      = aws_iam_group.data_team.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_group_policy_attachment" "data_rds" {
  group      = aws_iam_group.data_team.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess"
}

resource "aws_iam_group_policy_attachment" "data_glue" {
  group      = aws_iam_group.data_team.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}
