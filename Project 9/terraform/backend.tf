terraform {
  backend "s3" {
    # Replace ACCOUNT_ID with your AWS account ID before first init
    bucket         = "medinova-tfstate-ACCOUNT_ID"
    key            = "medinova/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "medinova-state-lock"
    encrypt        = true

    # Server-side encryption with AWS-managed key
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm = "AES256"
        }
      }
    }
  }
}
