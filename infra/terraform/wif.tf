# Workload Identity Federation: GitHub Actions xác thực GCP KHÔNG cần
# service account key trong secrets — keyless, không có credential để lộ.

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-${var.environment}"
  display_name              = "GitHub Actions (${var.environment})"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Chỉ repo này được phép — không repo nào khác dùng được pool.
  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "gha_deployer" {
  account_id   = "gha-deployer-${var.environment}"
  display_name = "GitHub Actions deployer (${var.environment})"
}

# Quyền tối thiểu để build & deploy — không hơn.
resource "google_project_iam_member" "gha_deployer_roles" {
  for_each = toset([
    "roles/artifactregistry.writer", # push image
    "roles/container.developer",     # kubectl apply lên GKE
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gha_deployer.email}"
}

# Cho phép identity từ GitHub repo impersonate service account trên.
resource "google_service_account_iam_member" "gha_wif_binding" {
  service_account_id = google_service_account.gha_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
