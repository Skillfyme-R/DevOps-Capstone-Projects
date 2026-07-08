environment        = "staging"
aws_region         = "us-east-1"
bucket_name        = "medicart-staging-assets-ACCOUNT_ID"

vpc_cidr           = "10.1.0.0/16"
public_subnets     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
private_subnets    = ["10.1.10.0/24", "10.1.11.0/24", "10.1.12.0/24"]
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

instance_type      = "t3.medium"
desired_capacity   = 2
min_capacity       = 2
max_capacity       = 6
kubernetes_version = "1.31"

db_name               = "medicartdb"
db_username           = "medicartadmin"
rds_instance          = "db.t3.small"
rds_allocated_storage = 50
# db_password — set via AWS Secrets Manager: medicart/staging/db-credentials
