# =============================================================================
# MediNova — Networking Module
# 3-tier VPC: public / private-app / private-database
# =============================================================================

# --- VPC ---
resource "aws_vpc" "medinova" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-vpc"
    Tier = "network"
  })
}

# --- Internet Gateway ---
resource "aws_internet_gateway" "medinova" {
  vpc_id = aws_vpc.medinova.id

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-igw"
  })
}

# --- Public Subnets ---
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.medinova.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false

  tags = merge(var.common_tags, {
    Name                     = "${var.name_prefix}-public-${count.index + 1}"
    Tier                     = "public"
    "kubernetes.io/role/elb" = "1"
  })
}

# --- Private Application Subnets ---
resource "aws_subnet" "private_app" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.medinova.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.common_tags, {
    Name                              = "${var.name_prefix}-private-app-${count.index + 1}"
    Tier                              = "private-app"
    "kubernetes.io/role/internal-elb" = "1"
  })
}

# --- Private Database Subnets ---
resource "aws_subnet" "private_database" {
  count = length(var.database_subnet_cidrs)

  vpc_id            = aws_vpc.medinova.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-private-db-${count.index + 1}"
    Tier = "private-database"
  })
}

# --- Elastic IP for NAT Gateway ---
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-nat-eip"
  })

  depends_on = [aws_internet_gateway.medinova]
}

# --- NAT Gateway (single, in first public subnet) ---
resource "aws_nat_gateway" "medinova" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-nat-gw"
  })

  depends_on = [aws_internet_gateway.medinova]
}

# --- Route Tables ---

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.medinova.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.medinova.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-public-rt"
  })
}

resource "aws_route_table" "private_app" {
  vpc_id = aws_vpc.medinova.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.medinova.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-private-app-rt"
  })
}

resource "aws_route_table" "private_database" {
  vpc_id = aws_vpc.medinova.id

  # Database subnets have no internet route — fully isolated
  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-private-db-rt"
  })
}

# --- Route Table Associations ---

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count          = length(aws_subnet.private_app)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app.id
}

resource "aws_route_table_association" "private_database" {
  count          = length(aws_subnet.private_database)
  subnet_id      = aws_subnet.private_database[count.index].id
  route_table_id = aws_route_table.private_database.id
}

# --- VPC Flow Logs (HIPAA network audit) ---

resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/medinova/${var.environment}/vpc-flow-logs"
  retention_in_days = 90

  tags = var.common_tags
}

resource "aws_iam_role" "flow_log_role" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.name_prefix}-vpc-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy" "flow_log_policy" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.name_prefix}-vpc-flow-log-policy"
  role  = aws_iam_role.flow_log_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Resource = "*"
    }]
  })
}

resource "aws_flow_log" "medinova" {
  count           = var.enable_flow_logs ? 1 : 0
  vpc_id          = aws_vpc.medinova.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_log_role[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-flow-log"
  })
}
