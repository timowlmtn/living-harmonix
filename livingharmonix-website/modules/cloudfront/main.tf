# modules/cloudfront/main.tf

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  aliases             = concat([var.domain_name], var.additional_domain_names)
  default_root_object = var.default_root_object

  origin {
    domain_name = var.origin_domain_name
    origin_id   = "S3-${var.origin_domain_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "S3-${var.origin_domain_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = var.certificate_arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(
    var.common_tags,
    {
      Name        = "cdn-${var.domain_name}"
      Environment = var.environment
    }
  )
}
