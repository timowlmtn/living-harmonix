# backend.tf

terraform {
  backend "s3" {
    # S3 bucket must exist prior to initializing Terraform
    bucket         = "livingharmonix-terraform-state"
    # Use workspaces to separate state per environment
    key            = "envs/${terraform.workspace}/terraform.tfstate"
    region         = "us-east-1"
    # DynamoDB table for state locking (must exist)
    dynamodb_table = "livingharmonix-terraform-locks"
    encrypt        = true
  }
}
