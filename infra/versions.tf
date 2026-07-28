# Terraform + provider pinning. Region is fixed to asia-southeast2 (Jakarta) in
# variables.tf; every resource below inherits it from the provider block.
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.12"
    }
  }

  # State lives in GCS, not in the repository. Supply the bucket at init time:
  #   terraform init -backend-config=backend.hcl
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}
