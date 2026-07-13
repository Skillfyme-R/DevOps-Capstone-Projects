output "db_endpoint" {
  value = aws_db_instance.pulsar.endpoint
}

output "db_address" {
  value = aws_db_instance.pulsar.address
}

output "db_name" {
  value = aws_db_instance.pulsar.db_name
}
