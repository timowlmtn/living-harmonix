# modules/s3-website/outputs.tf

# The name of the S3 bucket
output "bucket_name" {
  description = "Name of the S3 bucket for static website hosting"
  value       = aws_s3_bucket.this.id
}

# The ARN of the S3 bucket
output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.this.arn
}

# The static website endpoint (HTTP)
output "website_endpoint" {
  description = "S3 static website endpoint (HTTP)"
  value       = aws_s3_bucket.this.website_endpoint
}

# The regional domain name of the bucket (non-website)
output "bucket_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.this.bucket_domain_name
}
