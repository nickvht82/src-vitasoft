---
name: quality-standards
description: Bộ tiêu chuẩn chất lượng enterprise bắt buộc của Vitasoft — chính sách vòng đời dependency (không EOL), bảo mật chống hack/DDoS, code coverage 90%, E2E Playwright, Docker local, MCP integration. Dùng khi chọn dependency mới, review chất lượng, setup CI/CD, cấu hình bảo mật, viết test, hoặc bất kỳ quyết định nào ảnh hưởng chất lượng/an ninh hệ thống.
---

# Quality Standards — Tiêu chuẩn Enterprise Vitasoft

## 1. Chính sách vòng đời dependency (KHÔNG EOL)

Chạy phần mềm trên nền tảng hết hỗ trợ = không có bản vá bảo mật = lỗ hổng tích lũy.

- **Runtime:** chỉ dùng Node.js phiên bản **Active/Maintenance LTS** còn hỗ trợ ≥12 tháng.
  Tra endoflife.date/nodejs trước khi chọn. (Node 20 EOL 04/2026 — repo này dùng Node 22 LTS,
  EOL 04/2027; lên kế hoạch chuyển Node 24 trước Q1/2027.)
- **Thư viện mới:** trước khi thêm, kiểm tra: commit cuối <6 tháng, có maintainer hoạt động,
  không có CVE nghiêm trọng chưa vá. Thư viện bỏ hoang >12 tháng → tìm thay thế.
- **Major version:** nâng cấp trong vòng 6 tháng sau khi major mới ra ổn định — càng chờ
  càng đắt.
- **Kiểm tra định kỳ:** Dependabot quét hàng tuần (`.github/dependabot.yml`);
  patch/minor tự merge khi CI xanh, major cần review người.

## 2. Bảo mật — chống hack, DDoS, tấn công mạng

Phòng thủ theo lớp; mỗi lớp độc lập:

| Lớp | Biện pháp | Ở đâu |
|---|---|---|
| Edge/DDoS | Cloud Armor + rate limiting, WAF rules | GKE ingress (Phase 2 infra) |
| App | Validate mọi input tại boundary bằng zod; secure headers (CSP, HSTS); rate limit per-IP trên API routes | Code — builder chịu trách nhiệm |
| AuthN/Z | Không tự chế crypto/session — dùng thư viện chuẩn đã audit | Code |
| Secrets | Không bao giờ trong repo/code/log. Local: `.env` gitignored; prod: Secret Manager | Mọi nơi |
| Dependencies | `pnpm audit` trong CI, fail khi có CVE high/critical; Dependabot security updates bật | CI |
| OWASP Top 10 | Checklist khi QA review tính năng có input người dùng: injection, XSS, SSRF, broken access control | QA |

Nguyên tắc: dữ liệu từ người dùng, AI output, và API bên ngoài đều là **untrusted input** —
kể cả output của Claude phải validate trước khi dùng làm câu lệnh/query.

## 3. Code coverage ≥90% mỗi module

- Test runner: **Vitest** (nhanh, native TS/ESM). Mỗi package có coverage threshold trong config:
  ```ts
  // vitest.config.ts
  coverage: { thresholds: { lines: 90, functions: 90, branches: 85 } }
  ```
- CI fail nếu dưới ngưỡng — không phải "cảnh báo" mà là gate.
- 90% là sàn, không phải mục tiêu để lách: test phải assert hành vi, không phải chỉ gọi
  hàm cho qua coverage. QA reviewer kiểm tra chất lượng assertion, không chỉ con số.

## 4. E2E testing — Playwright

- Mọi user flow quan trọng (đăng nhập, thanh toán, luồng chính sản phẩm) có Playwright test
  trong `<app>/e2e/`.
- **Smoke suite** (nhanh, luồng chính) chạy trên mỗi PR; **full suite** chạy nightly.
- Test viết theo user behavior (`getByRole`, `getByText`), không selector CSS mong manh.
- Dùng Playwright fixtures + `webServer` config để tự khởi động app khi test.

## 5. Chạy local — Docker Desktop

- Mỗi service có `Dockerfile` multi-stage (build → runtime slim, non-root user).
- `docker-compose.yml` ở root cho phép chạy toàn hệ (app + Postgres + Redis) trên
  Docker Desktop bằng một lệnh: `docker compose up`.
- Image local giống image prod (cùng Dockerfile) — "chạy được ở local" nghĩa là gần
  như chắc chắn chạy được trên GKE.

## 6. MCP — develop, monitor, vận hành

- Cấu hình MCP servers cho project trong `.mcp.json` (repo root) để mọi dev session
  kết nối được: GitHub MCP (PR/issues), database MCP (inspect data local), và về sau
  Grafana/monitoring MCP khi Phase 4.
- Nguyên tắc: thao tác lặp lại qua UI ≥3 lần/tuần → tìm/cấu hình MCP server cho nó.

## 7. Framework hiện đại, dễ scale & upgrade

- Ưu tiên framework có: upgrade path chính thức (codemods), release cadence ổn định,
  backward-compat policy rõ ràng. Hiện tại: Next.js (App Router), NestJS cho backend
  service phức tạp, Prisma cho DB.
- Tránh: fork thư viện, patch node_modules, phụ thuộc behavior không documented —
  tất cả làm upgrade sau này đắt gấp nhiều lần.
- Mọi lựa chọn framework mới phải qua `deep-research` (ma trận + EOL check) trước.
