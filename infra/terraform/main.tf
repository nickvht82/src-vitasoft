locals {
  name_prefix = "vitasoft-${var.environment}"

  required_services = [
    "container.googleapis.com",        # GKE
    "artifactregistry.googleapis.com", # Docker images
    "sqladmin.googleapis.com",         # Cloud SQL
    "redis.googleapis.com",            # Memorystore
    "secretmanager.googleapis.com",    # Secrets
    "iamcredentials.googleapis.com",   # Workload Identity Federation
    "monitoring.googleapis.com",
    "logging.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each           = toset(local.required_services)
  service            = each.value
  disable_on_destroy = false
}

# --- GKE Autopilot ---------------------------------------------------------
# Autopilot thay vì Standard: Google quản node, tự scale, trả tiền theo pod —
# đúng nguyên tắc "managed trước self-host" cho team nhỏ (ARCHITECTURE.md §2.4).
resource "google_container_cluster" "main" {
  name     = local.name_prefix
  location = var.region

  enable_autopilot    = true
  deletion_protection = var.environment == "prod"

  release_channel {
    channel = "REGULAR"
  }

  # Workload Identity bật sẵn trên Autopilot — pods dùng GCP IAM không cần key file.

  depends_on = [google_project_service.required]
}

# --- Artifact Registry -----------------------------------------------------
resource "google_artifact_registry_repository" "docker" {
  repository_id = "vitasoft"
  location      = var.region
  format        = "DOCKER"
  description   = "Docker images for all Vitasoft apps."

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 20
    }
  }
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s" # 30 ngày
    }
  }

  depends_on = [google_project_service.required]
}

# --- Cloud SQL (PostgreSQL) ------------------------------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "${local.name_prefix}-pg"
  database_version = "POSTGRES_17"
  region           = var.region

  deletion_protection = var.db_deletion_protection

  settings {
    tier    = var.db_tier
    edition = "ENTERPRISE"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true # PITR — ARCHITECTURE.md §9
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled = false # chỉ private IP trong VPC
      private_network = "projects/${var.project_id}/global/networks/default"
    }

    maintenance_window {
      day  = 7 # Chủ nhật
      hour = 19 # 02:00 giờ VN (UTC+7)
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_sql_database" "app" {
  name     = "vitasoft"
  instance = google_sql_database_instance.postgres.name
}

resource "random_password" "db_app_user" {
  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  name     = "vitasoft_app"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_app_user.result
}

# --- Memorystore (Redis) ---------------------------------------------------
resource "google_redis_instance" "cache" {
  name           = "${local.name_prefix}-redis"
  memory_size_gb = var.redis_memory_gb
  region         = var.region
  tier           = var.environment == "prod" ? "STANDARD_HA" : "BASIC"
  redis_version  = "REDIS_7_2"

  depends_on = [google_project_service.required]
}

# --- Secret Manager --------------------------------------------------------
# App secrets tập trung tại đây; K8s đọc qua Workload Identity (không key file).
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${local.name_prefix}-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = format(
    "postgresql://%s:%s@%s:5432/%s",
    google_sql_user.app.name,
    random_password.db_app_user.result,
    google_sql_database_instance.postgres.private_ip_address,
    google_sql_database.app.name,
  )
}

resource "google_secret_manager_secret" "redis_url" {
  secret_id = "${local.name_prefix}-redis-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}
