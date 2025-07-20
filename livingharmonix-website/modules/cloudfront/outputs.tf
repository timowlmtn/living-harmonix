# livingharmonix-website/modules/cloudfront/outputs.tf

# The CloudFront distribution ID
output "distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.id
}

# The domain name assigned by CloudFront (used for DNS alias target)
output "domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.domain_name
}

# The ARN of the CloudFront distribution
output "distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.arn
}

# The current status of the distribution (e.g., Deployed, InProgress)
output "distribution_status" {
  description = "Current deployment status of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.status
}
