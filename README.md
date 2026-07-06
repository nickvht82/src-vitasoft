# Vitasoft

AI-powered software studio — monorepo chứa toàn bộ sản phẩm, core platform và hạ tầng.

[![CI](https://github.com/nickvht82/src-vitasoft/actions/workflows/ci.yml/badge.svg)](https://github.com/nickvht82/src-vitasoft/actions/workflows/ci.yml)

## Cấu trúc monorepo

| Đường dẫn | Package | Mô tả | Trạng thái |
|---|---|---|---|
| `api/` | `@vitasoft/api` | Backend core API — NestJS 11 + Fastify, Clean/Hexagonal Architecture + CQRS, port 3001 | ✅ Increment 1 |
| `core/config` | `@vitasoft/config` | Env config type-safe (zod), fail-fast | ✅ |
| `core/logger` | `@vitasoft/logger` | Structured JSON logging (pino) | ✅ |
| `core/ai` | `@vitasoft/ai` | Claude client dùng chung — mọi tính năng AI đi qua đây | ✅ |
| `core/database` | `@vitasoft/database` | Prisma 7 + PostgreSQL, schema + migrations | ✅ |
| `core/http-kit` | `@vitasoft/http-kit` | RFC 7807 errors, zod validation pipe, logging interceptor | ✅ |
| `vitasoft-homepage/` | `@vitasoft/homepage` | Trang chủ (Next.js, Tailwind — port 3000) | Skeleton |
| `admin/` | `@vitasoft/admin` | Admin console (Next.js + Ant Design 6 — port 3100, noindex) | Skeleton |
| `mind/` | `@vitasoft/mind` | Thần toán học — mind.vitasoft.io | Phase 3 |
| `marketing/` | `@vitasoft/marketing` | Marketing automation | Sau |
| `ideas/` | — | Ươm tạo ý tưởng mới (idea briefs) | — |
| `infra/` | — | Terraform (GKE, Cloud SQL, WIF) + Kustomize | ✅ IaC ready |
| `docs/` | — | Kiến trúc + research reports | ✅ |

## Yêu cầu môi trường

- **Node.js 24+** (Active LTS — [chính sách không-EOL](.claude/skills/quality-standards/SKILL.md))
- **pnpm 9+** — chạy `corepack enable` một lần (PowerShell/terminal admin)
- **Docker Desktop** — cho Postgres/Redis local

## Bắt đầu develop

```sh
# 1. Cài dependencies toàn workspace
pnpm install

# 2. Khởi động hạ tầng local (Postgres 17 + Redis 7)
docker compose up -d

# 3. Cấu hình env cho API
cp api/.env.example api/.env          # chỉnh nếu cần

# 4. Chạy migration
pnpm --filter @vitasoft/database exec prisma migrate deploy

# 5. Chạy app cần làm việc
pnpm --filter @vitasoft/api dev        # Backend API  → http://localhost:3001/docs
pnpm --filter @vitasoft/homepage dev   # Homepage     → http://localhost:3000
pnpm --filter @vitasoft/admin dev      # Admin        → http://localhost:3100
```

### Lệnh hằng ngày

```sh
pnpm typecheck    # typecheck toàn repo (Turborepo cache)
pnpm build        # build tất cả
pnpm test         # test + coverage (gate ≥90% lines/functions, 85% branches)
pnpm format       # prettier
```

## Kiến trúc backend (bắt buộc tuân thủ)

Clean/Hexagonal Architecture — xem chi tiết [api/README.md](api/README.md):

```
presentation → application → domain ← infrastructure
   (HTTP)        (CQRS)      (thuần)   (Prisma adapters)
```

- **Domain** không import framework/DB — chỉ entities + repository **ports** (interface)
- **Application** = command/query handlers (@nestjs/cqrs), chỉ phụ thuộc domain
- **Infrastructure** implement ports (Repository Pattern, inject qua DI token)
- **Presentation** = controllers gọi CommandBus/QueryBus, DTO validate bằng zod

## Quality gates (CI fail nếu vi phạm)

| Gate | Ngưỡng |
|---|---|
| Coverage | ≥90% lines/functions, ≥85% branches mỗi module |
| Security | `pnpm audit` — 0 CVE high/critical |
| Dependency | Không EOL; Dependabot auto-merge patch/minor |
| Convention | TSDoc cho export public `core/`; ESLint/Prettier |

Chi tiết: [.claude/skills/quality-standards/SKILL.md](.claude/skills/quality-standards/SKILL.md)

## CI/CD & Deploy

- **CI** ([ci.yml](.github/workflows/ci.yml)): typecheck → audit → build → test trên mỗi PR
- **CD staging** tự động khi merge `main`; **CD production** manual + human approval
- Hạ tầng GCP bằng **Terraform** — bootstrap guide: [infra/README.md](infra/README.md)

## Tài liệu

- 📐 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — kiến trúc đầy đủ (diagrams, auth flow, API flow, security layers)
- 🔬 [docs/research/](docs/research/) — các quyết định công nghệ kèm căn cứ
- 🤖 [CLAUDE.md](CLAUDE.md) — quy ước repo + harness AI (agents/skills phát triển sản phẩm)
- 🔒 [SECURITY.md](SECURITY.md) — chính sách báo cáo lỗ hổng

## Quy trình đóng góp

1. Tạo feature branch từ `main`
2. Code theo [quality-standards](.claude/skills/quality-standards/SKILL.md) — PR nhỏ (<400 dòng)
3. CI phải xanh; QA review (harness tự động khi dùng Claude Code)
4. Merge vào `main` → tự động deploy staging
