# Vitasoft

AI-powered software studio — monorepo chứa toàn bộ sản phẩm và core platform.

## Sản phẩm

- **[vitasoft-homepage](./vitasoft-homepage)** — trang chủ liên kết các sản phẩm
- **[mind](./mind)** — Thần toán học (mind.vitasoft.io)
- **[marketing](./marketing)** — marketing automation

## Bắt đầu

```sh
corepack enable          # bật pnpm
pnpm install
pnpm build
pnpm --filter @vitasoft/homepage dev
```

Yêu cầu: Node.js 24+ (Active LTS), pnpm 9+.

## Tài liệu

- [CLAUDE.md](./CLAUDE.md) — cấu trúc repo & quy ước
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — kiến trúc tổng thể & roadmap
- [infra/README.md](./infra/README.md) — hạ tầng (Phase 2)
