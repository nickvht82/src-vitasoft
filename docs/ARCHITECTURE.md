# Vitasoft — Kiến trúc Enterprise

## Tổng quan

Monorepo (`src-vitasoft`) chứa toàn bộ sản phẩm, chia sẻ core packages, deploy lên
Google Kubernetes Engine qua GitHub Actions CI/CD.

```
GitHub (src-vitasoft) ──push──▶ GitHub Actions
                                   │ build + test + docker build
                                   ▼
                          Artifact Registry ──▶ GKE (staging → prod)
                                                  │
                             Prometheus/Grafana ◀─┤ monitoring
                             Cloud Logging/Trace ◀┘
```

## Tech Stack

| Layer | Choice | Lý do |
|---|---|---|
| Frontend | Next.js 15 + React 19 + TypeScript | SSR/SSG, ecosystem lớn, dễ tuyển dev |
| Backend | Node.js 20 + NestJS/Express + Prisma | Chung ngôn ngữ với FE, type-safe DB |
| Database | PostgreSQL (Cloud SQL) + Redis (Memorystore) | Managed, backup tự động |
| AI | Claude API qua `@vitasoft/ai` | Opus 4.8 mặc định, streaming + tool use |
| Monorepo | pnpm workspaces + Turborepo | Cache builds, incremental CI |
| Infra | Terraform + GKE + Helm/Kustomize | Declarative, reproducible |
| Secrets | Google Secret Manager + KMS | Mã hoá at-rest, IAM-scoped, rotation |
| CI/CD | GitHub Actions | Native với repo, dễ setup |
| Observability | Prometheus + Grafana + Cloud Logging + Cloud Trace | Chuẩn K8s |

## AI Strategy (hot trends)

- **`@vitasoft/ai`** là điểm vào duy nhất cho mọi tính năng AI — model IDs, adaptive
  thinking, streaming đều được chuẩn hoá tại một chỗ.
- Model mặc định **Claude Opus 4.8**; Haiku 4.5 cho classification/routing rẻ;
  Fable 5 cho tác vụ reasoning khó nhất.
- **Tool use / agents**: dùng SDK tool runner (`betaZodTool` + `toolRunner`) cho
  các agentic workflow (chấm bài Mind, sinh campaign marketing).
- **Prompt caching** cho system prompt lớn (giảm ~90% chi phí input lặp lại).
- Tương lai: Managed Agents cho các workflow chạy dài, RAG trên tài liệu sản phẩm.

## Environments

| Env | Trigger | Cluster namespace |
|---|---|---|
| dev | local | — |
| staging | merge vào `main` | `vitasoft-staging` |
| prod | manual approval / release tag | `vitasoft-prod` |

## Security

- Secrets chỉ tồn tại trong Google Secret Manager (KMS-encrypted); local dev dùng
  `.env` gitignored.
- TLS mọi nơi (cert-manager + Let's Encrypt), RBAC per-service trên K8s.
- Dependabot + npm audit trong CI; container scan bằng Trivy (Phase 4).

## Roadmap

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 1 | Monorepo foundation, core packages, homepage, CI | ✅ Done |
| 2 | Terraform + GKE + Secret Manager + CD staging | ⬜ |
| 3 | Mind MVP (frontend + API + AI grading) | ⬜ |
| 4 | Observability + production hardening | ⬜ |
| 5 | Multi-product scale, ideas incubation | ⬜ |
