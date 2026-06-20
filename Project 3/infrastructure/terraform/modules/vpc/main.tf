terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

variable "environment" { type = string }
variable "region" { type = string; default = "us-east-1" }
variable "vpc_cidr" { type = string; default = "10.1.0.0/16" }
variable "azs" { type = list(string); default = ["us-east-1a", "us-east-1b", "us-east-1c"] }

locals {
  name_prefix = "medicore-${var.environment}"
  tags = {
    Platform    = "medicore"
    Environment = var.environment
    ManagedBy   = "terraform"
    CostCenter  = "healthcare-platform"
    Compliance  = "HIPAA"
  }
}

resource "aws_vpc" "medicore" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(local.tags, { Name = "${local.name_prefix}-vpc" })
}

resource "aws_internet_gateway" "medicore" {
  vpc_id = aws_vpc.medicore.id
  tags   = merge(local.tags, { Name = "${local.name_prefix}-igw" })
}

resource "aws_subnet" "public" {
  count                   = length(var.azs)
  vpc_id                  = aws_vpc.medicore.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  tags = merge(local.tags, {
    Name                     = "${local.name_prefix}-public-${var.azs[count.index]}"
    "kubernetes.io/role/elb" = "1"
  })
}

resource "aws_subnet" "private" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.medicore.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.azs[count.index]
  tags = merge(local.tags, {
    Name                              = "${local.name_prefix}-private-${var.azs[count.index]}"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

resource "aws_subnet" "database" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.medicore.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.azs[count.index]
  tags = merge(local.tags, {
    Name       = "${local.name_prefix}-db-${var.azs[count.index]}"
    Tier       = "database"
    Compliance = "HIPAA-PHI"
  })
}

resource "aws_eip" "nat" {
  count  = length(var.azs)
  domain = "vpc"
  tags   = merge(local.tags, { Name = "${local.name_prefix}-nat-eip-${count.index + 1}" })
}

resource "aws_nat_gateway" "medicore" {
  count         = length(var.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = merge(local.tags, { Name = "${local.name_prefix}-nat-${var.azs[count.index]}" })
  depends_on    = [aws_internet_gateway.medicore]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.medicore.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.medicore.id
  }
  tags = merge(local.tags, { Name = "${local.name_prefix}-public-rt" })
}

resource "aws_route_table" "private" {
  count  = length(var.azs)
  vpc_id = aws_vpc.medicore.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.medicore[count.index].id
  }
  tags = merge(local.tags, { Name = "${local.name_prefix}-private-rt-${var.azs[count.index]}" })
}

resource "aws_route_table_association" "public" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_flow_log" "medicore" {
  iam_role_arn    = aws_iam_role.vpc_flow_log.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.medicore.id
  tags            = merge(local.tags, { Name = "${local.name_prefix}-flow-logs" })
}

resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  name              = "/medicore/${var.environment}/vpc-flow-logs"
  retention_in_days = 90
  tags              = local.tags
}

resource "aws_iam_role" "vpc_flow_log" {
  name = "${local.name_prefix}-vpc-flow-log-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "vpc_flow_log" {
  name   = "${local.name_prefix}-vpc-flow-log-policy"
  role   = aws_iam_role.vpc_flow_log.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

output "vpc_id" { value = aws_vpc.medicore.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "database_subnet_ids" { value = aws_subnet.database[*].id }
