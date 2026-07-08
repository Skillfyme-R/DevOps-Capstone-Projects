# =============================================================================
# MediNova — Database Module
# RDS PostgreSQL 15 — HIPAA-compliant patient data store
# =============================================================================

# --- DB Subnet Group (uses isolated database tier) ---
resource "aws_db_subnet_group" "patient_db" {
  name        = "${var.name_prefix}-patient-db-subnet-group"
  description = "MediNova patient database subnet group — isolated tier"
  subnet_ids  = var.database_subnet_ids

  tags = merge(var.common_tags, {
    Name       = "${var.name_prefix}-patient-db-subnet-group"
    Compliance = "HIPAA"
  })
}

# --- PostgreSQL parameter group with audit settings ---
resource "aws_db_parameter_group" "patient_db" {
  name        = "${var.name_prefix}-pg15-params"
  family      = "postgres15"
  description = "MediNova PostgreSQL 15 parameter group with HIPAA audit settings"

  # Audit logging parameters
  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # log queries taking > 1 second
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-pg15-params"
  })
}

# --- RDS Instance ---
resource "aws_db_instance" "patient_db" {
  identifier = "${var.name_prefix}-patient-db"

  # Engine
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class

  # Storage — gp3 for cost-effective IOPS
  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.allocated_storage_gb * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  # Credentials
  db_name  = var.db_name
  username = var.db_master_username
  password = var.db_master_password

  # High availability
  multi_az = var.multi_az

  # Network
  db_subnet_group_name   = aws_db_subnet_group.patient_db.name
  vpc_security_group_ids = [var.db_security_group_id]
  publicly_accessible    = false

  # Parameter group
  parameter_group_name = aws_db_parameter_group.patient_db.name

  # Backups
  backup_retention_period = var.backup_retention
  backup_window           = "02:00-03:00"
  maintenance_window      = "Sun:03:00-Sun:04:00"

  # Protection
  deletion_protection   = var.environment == "prod" ? true : false
  skip_final_snapshot   = var.environment != "prod"
  copy_tags_to_snapshot = true

  final_snapshot_identifier = var.environment == "prod" ? "${var.name_prefix}-patient-db-final" : null

  # Observability
  performance_insights_enabled          = true
  performance_insights_retention_period = var.environment == "prod" ? 731 : 7
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_enhanced_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Auto minor version upgrades in non-prod
  auto_minor_version_upgrade = var.environment != "prod"

  tags = merge(var.common_tags, {
    Name       = "${var.name_prefix}-patient-db"
    DataClass  = "PHI"
    Compliance = "HIPAA"
  })
}

# --- IAM Role for RDS Enhanced Monitoring ---
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
