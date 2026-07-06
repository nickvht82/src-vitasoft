# Infrastructure as Code — Vitasoft

Toàn bộ hạ tầng GCP được định nghĩa bằng **Terraform** (`terraform/`) và manifest K8s bằng
**Kustomize** (`k8s/`). Không tạo hạ tầng bằng tay trên console — mọi thay đổi qua PR.

## Kiến trúc pipeline

```
PR chạm infra/terraform/  → terraform.yml: fmt + validate (+ plan nếu đã bootstrap)
Merge main                → terraform.yml: apply staging (tự động)
Merge main (code app)     → cd-staging.yml: build Docker → Artifact Registry → GKE staging
Manual dispatch / release → cd-production.yml: deploy image ĐÃ verify (không rebuild)
                            + environment "production" yêu cầu người approve
```

Nguyên tắc:
- **Keyless auth** — GitHub Actions xác thực GCP qua Workload Identity Federation,
  không có service account key nào nằm trong GitHub secrets.
- **Build một lần, deploy nhiều nơi** — prod dùng lại image SHA đã chạy trên staging.
- **Prod có human gate** — GitHub Environment `production` với required reviewers.

## Tài nguyên Terraform quản lý

| Resource | Ghi chú |
|---|---|
| GKE **Autopilot** | Google quản node, trả tiền theo pod — hợp team nhỏ |
| Artifact Registry | Cleanup policy: giữ 20 bản gần nhất, xoá untagged >30 ngày |
| Cloud SQL Postgres 17 | Private IP only, PITR 7 ngày, maintenance 02:00 VN Chủ nhật |
| Memorystore Redis 7.2 | BASIC (staging) / STANDARD_HA (prod) |
| Secret Manager | DATABASE_URL, REDIS_URL tự sinh từ Terraform |
| WIF pool + deployer SA | Chỉ repo này impersonate được; quyền tối thiểu (AR writer + container developer) |

## Bootstrap (một lần, cần gcloud CLI + billing account)

```sh
# 1. Tạo project + bật billing
gcloud projects create vitasoft-staging-<suffix>
gcloud billing projects link vitasoft-staging-<suffix> --billing-account=<BILLING_ID>

# 2. Bucket lưu Terraform state (versioning bật)
gcloud storage buckets create gs://vitasoft-tfstate-<suffix> \
  --location=asia-southeast1 --uniform-bucket-level-access
gcloud storage buckets update gs://vitasoft-tfstate-<suffix> --versioning

# 3. Apply lần đầu (local, với quyền owner của bạn)
cd infra/terraform
terraform init -backend-config="bucket=vitasoft-tfstate-<suffix>" -backend-config="prefix=vitasoft/staging"
terraform apply -var-file=environments/staging.tfvars -var="project_id=vitasoft-staging-<suffix>"

# 4. Lấy outputs và set vào GitHub repo → Settings → Variables:
#    GCP_PROJECT_ID, GCP_REGION=asia-southeast1, TF_STATE_BUCKET,
#    GCP_WIF_PROVIDER  (output workload_identity_provider),
#    GCP_DEPLOYER_SA   (output deployer_service_account)
# 5. Tạo GitHub Environments: "staging" và "production" (production: bật required reviewers)
# 6. Khi app có Dockerfile (Phase 2a): set DEPLOY_ENABLED=true → CD sống
```

Prod lặp lại với project riêng + `prod.tfvars` (tách project = tách blast radius + billing).

## Trạng thái kích hoạt

Các workflow được thiết kế **an toàn khi chưa bootstrap**: thiếu repo variables thì
terraform chỉ chạy validate, CD tự skip. Không có gì fail đỏ vô nghĩa.

| Điều kiện | Mở khoá |
|---|---|
| Set `GCP_PROJECT_ID` + WIF variables | terraform plan/apply thật |
| App có `Dockerfile` + `DEPLOY_ENABLED=true` | CD staging/prod |

## Chưa nằm trong IaC (theo roadmap)

- Cloud Armor policy + Ingress/cert-manager — Phase 2b khi có domain
- Deployment/Service/HPA manifests từng app — Phase 2a cùng lúc app có Dockerfile
- Grafana Cloud (SaaS, cấu hình qua UI/API riêng) — Phase 4
