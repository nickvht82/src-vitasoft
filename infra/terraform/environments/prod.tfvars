# terraform apply -var-file=environments/prod.tfvars -var="project_id=<PROJECT>"
environment            = "prod"
db_tier                = "db-custom-2-7680" # 2 vCPU / 7.5GB
db_deletion_protection = true
redis_memory_gb        = 1 # STANDARD_HA tự động theo environment=prod
