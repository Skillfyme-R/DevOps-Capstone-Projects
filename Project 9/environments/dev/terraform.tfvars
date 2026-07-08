environment        = "dev"
aws_region         = "us-east-1"
bucket_name        = "medicart-dev-assets-ACCOUNT_ID"

vpc_cidr           = "10.0.0.0/16"
public_subnets     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnets    = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

instance_type      = "t3.small"
desired_capacity   = 2
min_capacity       = 1
max_capacity       = 4
kubernetes_version = "1.31"

db_name              = "medicartdb"
db_username          = "medicartadmin"
rds_instance         = "db.t3.micro"
rds_allocated_storage = 20
# db_password — set via TF_VAR_db_password env var or AWS Secrets Manager
