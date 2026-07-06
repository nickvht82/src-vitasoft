---
name: product-build
description: Quy ước bắt buộc khi viết code trong monorepo vitasoft — cấu trúc package, TypeScript, cách dùng @vitasoft/ai cho tính năng AI, Next.js conventions. Dùng khi triển khai/sửa/thêm bất kỳ code nào trong repo này (tính năng mới, package mới, scaffold MVP, fix bug, refactor).
---

# Product Build — Quy ước Monorepo Vitasoft

## Cấu trúc quyết định vị trí code

| Loại code | Vị trí | Ghi chú |
|---|---|---|
| Logic dùng chung ≥2 sản phẩm | `core/<package>/` | Tạo package mới nếu chưa có chỗ hợp lý |
| Tính năng homepage | `vitasoft-homepage/src/` | Next.js App Router |
| Admin console (back-office) | `admin/src/` | Next.js + **Ant Design** — xem quy tắc UI dưới |
| Sản phẩm Mind | `mind/` | |
| Marketing tools | `marketing/` | |
| Thử nghiệm ý tưởng | `ideas/<slug>/` | Chỉ prototype, không cần production-grade |

## Quy tắc UI framework

- **Frontend sản phẩm** (homepage, mind, marketing, ideas): Tailwind + shadcn/ui.
- **Admin console (`admin/`) — và CHỈ admin console**: Ant Design (antd 6) — quyết định
  founder, vì admin cần bộ component data-heavy (Table, Form phức tạp) có sẵn.
- Không trộn hai hệ UI trong cùng một app; component dùng chung giữa hai hệ đặt ở
  mức logic (hooks, utils trong `core/`), không phải mức UI.

## Package mới trong core/

1. Đặt tên `@vitasoft/<name>`, folder `core/<name>/`.
2. `tsconfig.json` extend `../../tsconfig.base.json`, outDir `dist`, rootDir `src`.
3. Scripts tối thiểu: `build`, `typecheck`. Package tự động nằm trong workspace
   (`core/*` đã khai báo trong `pnpm-workspace.yaml`).
4. `"type": "module"`, main + types trỏ vào `dist/`.

## Tính năng AI — luôn qua @vitasoft/ai

Không import `@anthropic-ai/sdk` trực tiếp trong sản phẩm. Lý do: model IDs, thinking config,
và usage logging phải nhất quán toàn hệ thống — đổi một chỗ, mọi sản phẩm hưởng.

```ts
import { complete, streamText, MODELS } from "@vitasoft/ai";

// Tác vụ thường: mặc định opus. Classification/routing rẻ: haiku.
const answer = await complete(prompt, { model: "haiku", maxTokens: 512 });
```

Nếu cần khả năng SDK chưa được wrap (tool use, caching), **thêm helper vào `@vitasoft/ai`**
rồi dùng — đừng bypass.

## Chất lượng trước khi báo hoàn thành

Chạy theo thứ tự, cả 3 phải pass:

```sh
pnpm typecheck
pnpm build
pnpm test
```

Fail → sửa rồi chạy lại. Báo cáo kết quả nguyên văn, kể cả khi fail.

## Scope discipline

Làm đúng những gì task yêu cầu. Không thêm error handling cho tình huống không thể xảy ra,
không tạo abstraction cho nhu cầu tương lai giả định, không refactor code ngoài phạm vi task.
Nếu thấy vấn đề ngoài scope đáng sửa — ghi chú lại trong báo cáo, để leader quyết định.
