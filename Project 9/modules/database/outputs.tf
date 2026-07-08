output "db_endpoint" {
  value     = aws_db_instance.patient_db.endpoint
  sensitive = true
}
output "db_port" { value = aws_db_instance.patient_db.port }
output "db_name" { value = aws_db_instance.patient_db.db_name }
output "db_identifier" { value = aws_db_instance.patient_db.identifier }
