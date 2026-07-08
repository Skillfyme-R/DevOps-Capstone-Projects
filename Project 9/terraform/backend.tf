terraform {
  backend "s3" {
    bucket         = "medicart-tfstate-ACCOUNT_ID"
    key            = "global/s3/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "medicart-state-lock"
    encrypt        = true
  }
}
