output "vpc_id" { value = aws_vpc.medinova.id }
output "vpc_cidr" { value = aws_vpc.medinova.cidr_block }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private_app[*].id }
output "database_subnet_ids" { value = aws_subnet.private_database[*].id }
output "nat_gateway_id" { value = aws_nat_gateway.medinova.id }
output "internet_gateway_id" { value = aws_internet_gateway.medinova.id }
