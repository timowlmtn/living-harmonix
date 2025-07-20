# provider.tf

# Configure the AWS provider for all Terraform resources
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  # Automatically tag all resources for easier cost-allocation and management
  default_tags {
    tags = {
      Project     = "livingharmonix-website"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
