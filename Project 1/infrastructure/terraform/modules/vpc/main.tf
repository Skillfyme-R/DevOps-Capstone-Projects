# =============================================================================
# NexusFinance VPC (Virtual Private Cloud) Module
#
# A VPC is a private, isolated section of AWS where your resources live.
# Think of it as your own private data center inside AWS.
#
# Network design for FinTech:
#   Public subnets:   Internet-facing load balancers only
#   Private subnets:  Application servers (no direct internet access)
#   Isolated subnets: Database and cache (no internet at all)
#
# Why isolated DB?
#   If your API server is compromised, the attacker still can't reach
#   the database directly — they'd need to pivot through the API server.
#   Defense in depth.
# =============================================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "environment"  { type = string }
variable "project_name" { type = string }
variable "vpc_cidr"     { type = string; default = "10.0.0.0/16" }

locals {
  name = "${var.project_name}-${var.environment}"

  # Distribute subnets across 3 Availability Zones for fault tolerance
  azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Subnet CIDR blocks (each /24 = 256 IPs)
  public_cidrs   = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_cidrs  = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  isolated_cidrs = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
}

# ── VPC ───────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true   # Allows EC2/EKS nodes to resolve DNS
  enable_dns_support   = true

  tags = {
    Name        = "${local.name}-vpc"
    Environment = var.environment
    Platform    = "nexusfinance"
    ManagedBy   = "terraform"
  }
}

# ── Internet Gateway (for public subnets) ────────────────────────────────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${local.name}-igw"
    Environment = var.environment
  }
}

# ── Public Subnets (Load Balancers) ──────────────────────────────────────────
resource "aws_subnet" "public" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.public_cidrs[count.index]
  availability_zone = local.azs[count.index]

  # Instances in public subnets get public IPs automatically
  map_public_ip_on_launch = true

  tags = {
    Name        = "${local.name}-public-${local.azs[count.index]}"
    Type        = "public"
    Environment = var.environment
    # These tags tell the AWS Load Balancer Controller which subnets to use
    "kubernetes.io/role/elb" = "1"
  }
}

# ── Private Subnets (Application Servers / EKS Nodes) ────────────────────────
resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name        = "${local.name}-private-${local.azs[count.index]}"
    Type        = "private"
    Environment = var.environment
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# ── Isolated Subnets (Database, Redis — no internet access at all) ────────────
resource "aws_subnet" "isolated" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.isolated_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name        = "${local.name}-isolated-${local.azs[count.index]}"
    Type        = "isolated"
    Environment = var.environment
  }
}

# ── NAT Gateway (allows private subnets to reach internet for outbound traffic)
# Placed in the FIRST public subnet.
# Private subnet → NAT Gateway → Internet Gateway → Internet
# But internet CANNOT initiate connections to private subnets.
resource "aws_eip" "nat" {
  count  = 1
  domain = "vpc"
  tags   = { Name = "${local.name}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "${local.name}-nat"
    Environment = var.environment
  }
}

# ── Route Tables ─────────────────────────────────────────────────────────────

# Public: Route all traffic to Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${local.name}-public-rt" }
}

# Private: Route internet-bound traffic through NAT Gateway
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = { Name = "${local.name}-private-rt" }
}

# Isolated: NO internet route (database isolation)
resource "aws_route_table" "isolated" {
  vpc_id = aws_vpc.main.id
  # No routes — isolated subnets can ONLY communicate within the VPC
  tags = { Name = "${local.name}-isolated-rt" }
}

# Associate subnets with route tables
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

resource "aws_route_table_association" "isolated" {
  count          = length(aws_subnet.isolated)
  subnet_id      = aws_subnet.isolated[count.index].id
  route_table_id = aws_route_table.isolated.id
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "vpc_id"           { value = aws_vpc.main.id }
output "public_subnet_ids"   { value = aws_subnet.public[*].id }
output "private_subnet_ids"  { value = aws_subnet.private[*].id }
output "isolated_subnet_ids" { value = aws_subnet.isolated[*].id }
