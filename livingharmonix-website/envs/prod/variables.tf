# livingharmonix-website/envs/prod/variables.tf

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

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Primary domain for the website"
  type        = string
  default     = "livingharmonix.com"
}

variable "additional_domain_names" {
  description = "Alternate domain names (CNAMEs) for the site"
  type        = list(string)
  default     = ["www.livingharmonix.com"]
}

variable "certificate_arn" {
  description = "ACM certificate ARN (must be in us-east-1) for CloudFront HTTPS"
  type        = string
  default     = "arn:aws:acm:us-east-1:123456789012:certificate/your-certificate-id"
}

variable "distribution_hosted_zone_id" {
  description = "Route 53 zone ID for CloudFront distributions"
  type        = string
  default     = "Z2FDTNDATAQYW2"
}

variable "common_tags" {
  description = "Additional tags applied to all resources"
  type        = map(string)
  default = {
    Project     = "livingharmonix-website"
    Environment = "prod"
  }
}
