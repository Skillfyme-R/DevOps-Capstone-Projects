locals {
  name_prefix = "pulsar-${var.pulsar_environment}"
}

resource "aws_db_subnet_group" "pulsar" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = var.pulsar_db_subnet_ids

  tags = {
    Name = "${local.name_prefix}-db-subnet-group"
  }
}

resource "aws_db_instance" "pulsar" {
  identifier     = "${local.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = "16"

  instance_class    = var.pulsar_db_instance_class
  allocated_storage = var.pulsar_db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.pulsar_db_name
  username = var.pulsar_db_username
  password = var.pulsar_db_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.pulsar.name
  vpc_security_group_ids = [var.pulsar_db_security_group_id]

  multi_az                   = var.pulsar_db_multi_az
  backup_retention_period    = var.pulsar_db_backup_retention_days
  auto_minor_version_upgrade = true

  # Flyway (run by pulsar-server on boot) owns schema migrations — final snapshot protects against accidental data loss on teardown.
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name_prefix}-postgres-final"
  deletion_protection       = var.pulsar_environment == "production"

  tags = {
    Name    = "${local.name_prefix}-postgres"
    Product = "pulsar"
  }
}
