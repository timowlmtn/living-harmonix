# Living Harmonix Website Terraform Project

This repository contains everything you need to build and deploy the Living Harmonix static website (`livingharmonix.com`) on AWS using Terraform. The Terraform code is organized into reusable modules for S3 website hosting, CloudFront CDN, and Route 53 DNS, with separate environment overlays for staging and production. The website source lives under `website/src` and is compiled into `website/dist` before deployment.

## Prerequisites
- Terraform ≥ 1.5.0
- AWS CLI configured with your credentials (aws configure)
- Node.js & npm (or another build tool) for front-end assets
- An ACM certificate in us-east-1 for livingharmonix.com

## Build the Website

1. Install front-end dependencies (if any):
    
    ```bash
        cd website
        make install
    ```

2. Run the build script to generate website/dist:
    
    ```bash
        ./scripts/build_website.sh
    ````

3. Verify that website/dist/index.html and asset folders are populated.

## Deploy Infrastructure

1. Initialize Terraform and select (or create) your workspace:

    ```bash
    cd terraform
    terraform init
    terraform workspace new staging   # or `terraform workspace select staging`
   ```

2. Apply the staging environment:

    ```bash
    ../scripts/deploy_terraform.sh staging
   ```
   
3. Repeat for production:

```bash
terraform workspace new prod
../scripts/deploy_terraform.sh prod
```

## Environment Variables & Overrides

- Override defaults via environment variables or CLI flags:

    - AWS_PROFILE, AWS_REGION
    - TF_VAR_certificate_arn, TF_VAR_additional_domain_names

- See terraform/envs/*/variables.tf for per-env defaults.

## Cleanup

- Destroy staging resources:

```bash
    terraform workspace select staging
    terraform destroy
```

- Switch back to the default workspace:

```bash
terraform workspace select default
```

# Directory Stucture

```text
livingharmonix-website/
├── README.md
├── terraform/
│   ├── versions.tf
│   ├── provider.tf
│   ├── backend.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── modules/
│   │   ├── s3-website/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── cloudfront/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   └── route53/
│   │       ├── main.tf
│   │       ├── variables.tf
│   │       └── outputs.tf
│   └── envs/
│       ├── staging/
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── backend.tf
│       └── prod/
│           ├── main.tf
│           ├── variables.tf
│           └── backend.tf
├── website/
│   ├── src/
│   │   ├── index.html
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   └── app.js
│   │   └── images/
│   │       └── logo.png
│   └── dist/
└── scripts/
    ├── build_website.sh
    └── deploy_terraform.sh

