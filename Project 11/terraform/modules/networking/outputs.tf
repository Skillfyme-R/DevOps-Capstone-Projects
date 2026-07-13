output "vpc_id" {
  value = aws_vpc.pulsar.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "server_security_group_id" {
  value = aws_security_group.server.id
}

output "database_security_group_id" {
  value = aws_security_group.database.id
}

output "cache_security_group_id" {
  value = aws_security_group.cache.id
}
