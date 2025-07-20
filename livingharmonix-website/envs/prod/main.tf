# livingharmonix-website/envs/prod/main.tf

# ————————————————————————————————————————————————————————————————————————————————
# Instantiate the S3 bucket module for static website hosting
# ————————————————————————————————————————————————————————————————————————————————
module "s3_website" {
  source      = "../../modules/s3-website"
  bucket_name = "${var.environment}-${replace(var.domain_name, ".", "-")}-site"
  environment = var.environment
  common_tags = var.common_tags
}

# ————————————————————————————————————————————————————————————————————————————————
# Instantiate the CloudFront CDN module to front the S3 website
# ————————————————————————————————————————————————————————————————————————————————
module "cloudfront" {
  source                   = "../../modules/cloudfront"
  domain_name              = var.domain_name
  additional_domain_names  = var.additional_domain_names
  default_root_object      = "index.html"
  origin_domain_name       = module.s3_website.website_endpoint
  certificate_arn          = var.certificate_arn
  environment              = var.environment
  common_tags              = var.common_tags
}

# ————————————————————————————————————————————————————————————————————————————————
# Instantiate the Route 53 DNS module to point your custom domain at CloudFront
# ————————————————————————————————————————————————————————————————————————————————
module "route53" {
  source                         = "../../modules/route53"
  domain_name                    = var.domain_name
  distribution_domain_name       = module.cloudfront.domain_name
  distribution_hosted_zone_id    = var.distribution_hosted_zone_id
  environment                    = var.environment
  common_tags                    = var.common_tags
}
