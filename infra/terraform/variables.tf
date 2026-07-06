variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Primary region for all resources."
  type        = string
  default     = "asia-southeast1" # Singapore — gần user VN nhất
}

variable "environment" {
  description = "Environment name: staging | prod."
  type        = string

  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "environment must be staging or prod."
  }
}

variable "github_repo" {
  description = "GitHub repo (owner/name) allowed to deploy via Workload Identity Federation."
  type        = string
  default     = "nickvht82/src-vitasoft"
}

variable "db_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-1-3840" # 1 vCPU / 3.75GB — đủ cho giai đoạn đầu
}

variable "db_deletion_protection" {
  description = "Protect the database from accidental terraform destroy."
  type        = bool
  default     = true
}

variable "redis_memory_gb" {
  description = "Memorystore Redis size in GB."
  type        = number
  default     = 1
}
