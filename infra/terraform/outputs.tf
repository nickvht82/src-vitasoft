output "cluster_name" {
  value = google_container_cluster.main.name
}

output "artifact_registry" {
  description = "Docker registry prefix — dùng trong CD workflow."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "workload_identity_provider" {
  description = "Set vào GitHub repo variable GCP_WIF_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account" {
  description = "Set vào GitHub repo variable GCP_DEPLOYER_SA."
  value       = google_service_account.gha_deployer.email
}

output "postgres_private_ip" {
  value     = google_sql_database_instance.postgres.private_ip_address
  sensitive = true
}

output "redis_host" {
  value     = google_redis_instance.cache.host
  sensitive = true
}
