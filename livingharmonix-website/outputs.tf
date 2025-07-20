# outputs.tf

# The name of the S3 bucket hosting your static website
output "website_bucket_name" {
  description = "Name of the S3 bucket used for static website hosting"
  value       = module.s3-website.bucket_name
}

# The website endpoint (HTTP) for the S3‐hosted site
output "website_bucket_endpoint" {
  description = "S3 static website endpoint (HTTP)"
  value       = module.s3-website.website_endpoint
}

# The CloudFront distribution ID
output "cdn_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.cloudfront.distribution_id
}

# The CloudFront distribution domain name (used by DNS & URLs)
output "cdn_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.cloudfront.domain_name
}

# The full HTTPS URL to your site via CloudFront
output "website_url" {
  description = "Public HTTPS URL for the website"
  value       = "https://${module.cloudfront.domain_name}"
}

# The Route53 record that points your custom domain to CloudFront
output "dns_record_name" {
  description = "The DNS record name created in Route 53"
  value       = module.route53.record_name
}

# The hosted zone ID in Route 53
output "hosted_zone_id" {
  description = "ID of the Route 53 hosted zone for your domain"
  value       = module.route53.hosted_zone_id
}
