# Vitasoft Admin — Back-office Console

Giao diện quản trị nội bộ để vận hành các sản phẩm Vitasoft: quản lý người dùng,
cấu hình hệ thống, theo dõi hoạt động. Nói chuyện trực tiếp với NestJS backend
(core services) qua OpenAPI client.

## Quy ước riêng của module này

- **UI framework: Ant Design (antd 6)** — quyết định của founder cho admin console.
  Đây là ngoại lệ duy nhất: các frontend sản phẩm (homepage, mind, ...) dùng
  Tailwind + shadcn/ui. Không trộn hai hệ trong cùng một app.
- `robots: noindex` — admin không bao giờ xuất hiện trên search engine.
- Chạy port **3100** (tránh đụng homepage 3000).
- Mọi trang sau này đều nằm sau authentication (better-auth, role admin) —
  dashboard hiện tại là skeleton chưa gắn auth.

## Chạy local

```sh
pnpm --filter @vitasoft/admin dev   # http://localhost:3100
```
