# livingharmonix-website/modules/route53/main.tf

# Lookup the hosted zone for your domain
data "aws_route53_zone" "primary" {
  name         = "${var.domain_name}."
  private_zone = false
}

# Create an A alias record pointing your apex domain to the CloudFront distribution
resource "aws_route53_record" "alias_a" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.distribution_domain_name
    zone_id                = var.distribution_hosted_zone_id
    evaluate_target_health = false
  }

  tags = merge(
    var.common_tags,
    {
      Name        = var.domain_name
      Environment = var.environment
    }
  )
}

# Create an AAAA alias record for IPv6 support
resource "aws_route53_record" "alias_aaaa" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = var.distribution_domain_name
    zone_id                = var.distribution_hosted_zone_id
    evaluate_target_health = false
  }

  tags = merge(
    var.common_tags,
    {
      Name        = var.domain_name
      Environment = var.environment
    }
  )
}
