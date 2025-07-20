# variables.tf

# AWS settings
variable "aws_region" {
  description = "AWS region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "default"
}

# Deployment environment
variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Domain settings
variable "domain_name" {
  description = "Primary domain name for the website"
  type        = string
  default     = "livingharmonix.com"
}

variable "additional_domain_names" {
  description = "Additional domain names (CNAMEs) to attach to CloudFront"
  type        = list(string)
  default     = []
}

# TLS certificate
variable "certificate_arn" {
  description = "ARN of the ACM certificate for CloudFront (must be in us-east-1)"
  type        = string
}

# Tags (optional overrides)
variable "common_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
