# livingharmonix-website/modules/s3-website/variables.tf

variable "bucket_name" {
  description = "Name of the S3 bucket to create for static website hosting"
  type        = string
}

variable "index_document" {
  description = "Document S3 will return for index requests"
  type        = string
  default     = "index.html"
}

variable "error_document" {
  description = "Document S3 will return for error responses"
  type        = string
  default     = "error.html"
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
}

variable "common_tags" {
  description = "Additional tags to apply to the bucket"
  type        = map(string)
  default     = {}
}
