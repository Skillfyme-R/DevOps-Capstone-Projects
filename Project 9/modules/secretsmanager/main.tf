resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "medicart/${var.environment}/db-credentials"
  description             = "MediCart PostgreSQL database credentials"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "medicart-${var.environment}-db-credentials"
    Environment = var.environment
    Compliance  = "HIPAA"
    Project     = "medicart-platform"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    endpoint = var.db_endpoint
    dbname   = var.db_name
    port     = 5432
    engine   = "postgres"
  })
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "medicart/${var.environment}/app-secrets"
  description             = "MediCart application secrets (JWT, API keys)"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "medicart-${var.environment}-app-secrets"
    Environment = var.environment
    Compliance  = "HIPAA"
    Project     = "medicart-platform"
  }
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    jwt_secret          = "REPLACE_WITH_SECURE_RANDOM_STRING"
    payment_gateway_key = "REPLACE_WITH_PAYMENT_GATEWAY_API_KEY"
    sms_api_key         = "REPLACE_WITH_SMS_PROVIDER_API_KEY"
    email_api_key       = "REPLACE_WITH_EMAIL_PROVIDER_API_KEY"
  })
}
