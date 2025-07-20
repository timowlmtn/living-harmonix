# livingharmonix-website/modules/route53/variables.tf

variable "domain_name" {
  description = "Primary domain name for which to manage DNS records"
  type        = string
}

variable "distribution_domain_name" {
  description = "The domain name of the CloudFront distribution (alias target)"
  type        = string
}

variable "distribution_hosted_zone_id" {
  description = "The Route 53 hosted zone ID for the CloudFront distribution domain"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
}

variable "common_tags" {
  description = "Additional tags to apply to Route 53 records"
  type        = map(string)
  default     = {}
}
