output "endpoint"       { value = aws_db_instance.main.endpoint }
output "db_name"        { value = aws_db_instance.main.db_name }
output "username"       { value = aws_db_instance.main.username }
output "security_group_id" { value = aws_security_group.postgres.id }
