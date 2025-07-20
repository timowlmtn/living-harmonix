# livingharmonix-website/modules/cloudfront/variables.tf

variable "domain_name" {
  description = "Primary domain name for the CloudFront distribution"
  type        = string
}

variable "additional_domain_names" {
  description = "Additional CNAMEs (alternate domain names) for the distribution"
  type        = list(string)
  default     = []
}

variable "default_root_object" {
  description = "Default root object (e.g., index.html) to serve when no object is specified"
  type        = string
  default     = "index.html"
}

variable "origin_domain_name" {
  description = "Origin domain name for the distribution (e.g., S3 website endpoint or custom origin)"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate (in us-east-1) to use for HTTPS"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
}

variable "common_tags" {
  description = "Additional tags to apply to the CloudFront distribution"
  type        = map(string)
  default     = {}
}
