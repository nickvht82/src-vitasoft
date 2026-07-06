# Vitasoft Monorepo

AI-powered software studio monorepo. Products live in top-level folders and share
core packages under `core/`.

## Structure

| Path | Package | Purpose |
|---|---|---|
| `core/config` | `@vitasoft/config` | Type-safe env config (zod), fail-fast validation |
| `core/logger` | `@vitasoft/logger` | Structured JSON logging (pino) for Cloud Logging |
| `core/ai` | `@vitasoft/ai` | Shared Claude client — all AI features go through this |
| `vitasoft-homepage` | `@vitasoft/homepage` | Main landing site (Next.js) linking all products |
| `mind` | `@vitasoft/mind` | Math learning platform (mind.vitasoft.io) — Phase 3 |
| `marketing` | `@vitasoft/marketing` | Marketing automation — later phase |
| `ideas/*` | — | Incubation folder for new product ideas |
| `infra` | — | Terraform / K8s / Helm — Phase 2 |

## Commands

```sh
pnpm install          # install all workspace deps
pnpm build            # turbo build (all packages)
pnpm typecheck        # typecheck all
pnpm test             # test all
pnpm --filter @vitasoft/homepage dev   # run one product
```

## Conventions

- **Package manager:** pnpm workspaces + Turborepo. Node 24+ (Active LTS — theo chính sách không-EOL trong skill `quality-standards`: không dùng bản Maintenance cho code mới).
- **Convention & principles:** mọi code tuân thủ quality-standards mục 7 (naming, TSDoc cho export public core/, ESLint/Prettier là luật) và mục 8 (SOLID chọn lọc, KISS>DRY>YAGNI, fail-fast, immutability mặc định).
- **TypeScript strict** everywhere; packages extend `tsconfig.base.json`.
- **AI:** never import `@anthropic-ai/sdk` directly in products — use `@vitasoft/ai`
  (consistent model IDs, adaptive thinking, streaming helpers).
- **Secrets:** never commit. Local dev uses `.env` (gitignored); K8s uses Google
  Secret Manager.
- **Branches:** feature branches → PR → `main`. CI (typecheck/build/test) must pass.

## Hài hòa (Harness): Vitasoft Product Development

**Mục tiêu:** Brainstorm ý tưởng mới và đảm bảo chất lượng khi AI xây dựng sản phẩm Vitasoft.

**Trigger:** Khi có yêu cầu phát triển sản phẩm (brainstorm ý tưởng, xây/sửa tính năng, tạo MVP, QA), dùng skill `vitasoft-dev`. Câu hỏi thuần túy trả lời trực tiếp được.

**Biến đổi (Change log):**
| Ngày | Thay đổi | Đối tượng | Lý do |
|------|----------|----------|-------|
| 2026-07-06 | Khởi tạo harness: 3 agents (product-strategist, builder, qa-reviewer) + 4 skills (vitasoft-dev, idea-incubation, product-build, qa-verification) | Toàn bộ | - |
| 2026-07-06 | Thêm agent research-analyst + skills deep-research, quality-standards; builder/qa-reviewer tham chiếu quality-standards; orchestrator thêm Phase 1b Research | agents/, skills/ | Yêu cầu deep research + tiêu chuẩn chất lượng enterprise |
| 2026-07-06 | Node 20→22 (Node 20 EOL 04/2026), thêm Dependabot + auto-merge patch/minor, pnpm audit trong CI | package.json, .github/ | Chính sách dependency không-EOL |
| 2026-07-06 | Node 22→24 (22 đã vào Maintenance); thêm quality-standards mục 7 (convention + code docs) & mục 8 (best practices/principles); qa-reviewer thêm gate convention | skills/quality-standards, agents/qa-reviewer, package.json, ci.yml | Feedback founder: siết quality gate |

## Roadmap

Phase 1 (done): monorepo foundation, core packages, homepage skeleton, CI.
Phase 2: GKE + Terraform + Secret Manager (`infra/`).
Phase 3: Mind MVP. Phase 4: observability. Phase 5: scale/multi-product.
See `docs/ARCHITECTURE.md` for the full plan.
