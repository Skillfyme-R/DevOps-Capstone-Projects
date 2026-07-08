environment        = "prod"
aws_region         = "us-east-1"
bucket_name        = "medicart-prod-assets-ACCOUNT_ID"

vpc_cidr           = "10.2.0.0/16"
public_subnets     = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
private_subnets    = ["10.2.10.0/24", "10.2.11.0/24", "10.2.12.0/24"]
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

instance_type      = "t3.large"
desired_capacity   = 3
min_capacity       = 2
max_capacity       = 10
kubernetes_version = "1.31"

db_name               = "medicartdb"
db_username           = "medicartadmin"
rds_instance          = "db.t3.medium"
rds_allocated_storage = 100
# db_password — CHANGE_ME — Use AWS Secrets Manager: medicart/prod/db-credentials
