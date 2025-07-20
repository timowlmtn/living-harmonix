# livingharmonix-website/modules/route53/outputs.tf

# ID of the Route 53 hosted zone for the primary domain
output "hosted_zone_id" {
  description = "ID of the Route 53 hosted zone for the domain"
  value       = data.aws_route53_zone.primary.zone_id
}

# Name of the Route 53 hosted zone
output "hosted_zone_name" {
  description = "Name of the Route 53 hosted zone"
  value       = data.aws_route53_zone.primary.name
}

# The name of the A alias record created
output "record_name" {
  description = "Name of the Route 53 A alias record"
  value       = aws_route53_record.alias_a.name
}

# The fully-qualified domain name of the alias record (A)
output "record_fqdn" {
  description = "Fully qualified domain name of the A alias record"
  value       = aws_route53_record.alias_a.fqdn
}

# The ID of the A alias record resource
output "record_id" {
  description = "Terraform resource ID of the A alias record"
  value       = aws_route53_record.alias_a.id
}
