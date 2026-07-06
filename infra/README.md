# Infrastructure — Vitasoft

Infrastructure as Code cho toàn bộ platform. Sẽ được xây dựng trong **Phase 2**.

## Cấu trúc dự kiến

```
infra/
├── terraform/          # GKE cluster, VPC, Cloud SQL, Secret Manager, KMS
│   ├── environments/   # dev / staging / prod
│   └── modules/
├── k8s/
│   ├── base/           # namespace, ingress, cert-manager
│   └── overlays/       # kustomize per environment
└── helm/               # per-service charts (homepage, mind-api, ...)
```

## Nguyên tắc

- **Credentials**: Google Secret Manager + KMS — không bao giờ commit secrets vào repo.
- **CD**: GitHub Actions build image → Artifact Registry → deploy GKE (staging tự động, prod manual approval).
- **Monitoring**: Prometheus + Grafana + Cloud Logging + Cloud Trace.
