# terraform apply -var-file=environments/staging.tfvars -var="project_id=<PROJECT>"
environment            = "staging"
db_tier                = "db-custom-1-3840"
db_deletion_protection = false # staging được phép destroy/rebuild
redis_memory_gb        = 1
