terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State lưu trên GCS — bucket tạo một lần khi bootstrap (xem infra/README.md).
  # Init: terraform init -backend-config="bucket=<STATE_BUCKET>" -backend-config="prefix=vitasoft/<env>"
  backend "gcs" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}
