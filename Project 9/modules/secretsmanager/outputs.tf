output "secret_arn" {
  value     = aws_secretsmanager_secret.db_credentials.arn
  sensitive = true
}
output "app_secret_arn" {
  value     = aws_secretsmanager_secret.app_secrets.arn
  sensitive = true
}
