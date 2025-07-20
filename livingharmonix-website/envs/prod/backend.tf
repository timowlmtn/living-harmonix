# livingharmonix-website/envs/prod/backend.tf

terraform {
  backend "s3" {
    # Shared state bucket (must already exist)
    bucket         = "livingharmonix-terraform-state"
    # Environment-specific state file
    key            = "envs/prod/terraform.tfstate"
    region         = "us-east-1"
    # DynamoDB table for state locking (must already exist)
    dynamodb_table = "livingharmonix-terraform-locks"
    encrypt        = true
  }
}
