locals {
  name_prefix = "pulsar-${var.pulsar_environment}"
}

resource "aws_vpc" "pulsar" {
  cidr_block           = var.pulsar_vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name    = "${local.name_prefix}-vpc"
    Product = "pulsar"
  }
}

resource "aws_internet_gateway" "pulsar" {
  vpc_id = aws_vpc.pulsar.id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.pulsar_public_subnet_cidrs)
  vpc_id                  = aws_vpc.pulsar.id
  cidr_block              = var.pulsar_public_subnet_cidrs[count.index]
  availability_zone       = var.pulsar_availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${var.pulsar_availability_zones[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.pulsar_private_subnet_cidrs)
  vpc_id            = aws_vpc.pulsar.id
  cidr_block        = var.pulsar_private_subnet_cidrs[count.index]
  availability_zone = var.pulsar_availability_zones[count.index]

  tags = {
    Name = "${local.name_prefix}-private-${var.pulsar_availability_zones[count.index]}"
    Tier = "private"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-nat-eip"
  }
}

# Single NAT gateway keeps cost down for a non-exotic setup; use one per AZ for full HA in production-critical estates.
resource "aws_nat_gateway" "pulsar" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${local.name_prefix}-nat"
  }

  depends_on = [aws_internet_gateway.pulsar]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.pulsar.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.pulsar.id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.pulsar.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.pulsar.id
  }

  tags = {
    Name = "${local.name_prefix}-private-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_security_group" "server" {
  name        = "${local.name_prefix}-server-sg"
  description = "Pulsar server pods/nodes — ingress from within the VPC only"
  vpc_id      = aws_vpc.pulsar.id

  ingress {
    description = "HTTP API from within the VPC"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.pulsar_vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-server-sg"
  }
}

resource "aws_security_group" "database" {
  name        = "${local.name_prefix}-database-sg"
  description = "Pulsar RDS Postgres — ingress from server security group only"
  vpc_id      = aws_vpc.pulsar.id

  ingress {
    description     = "Postgres from Pulsar server"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.server.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-database-sg"
  }
}

resource "aws_security_group" "cache" {
  name        = "${local.name_prefix}-cache-sg"
  description = "Pulsar ElastiCache Redis — ingress from server security group only"
  vpc_id      = aws_vpc.pulsar.id

  ingress {
    description     = "Redis from Pulsar server"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.server.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-cache-sg"
  }
}
