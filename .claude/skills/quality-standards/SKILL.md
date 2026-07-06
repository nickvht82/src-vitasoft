---
name: quality-standards
description: Bộ tiêu chuẩn chất lượng enterprise bắt buộc của Vitasoft — chính sách vòng đời dependency (không EOL), bảo mật chống hack/DDoS, code coverage 90%, E2E Playwright, Docker local, MCP integration. Dùng khi chọn dependency mới, review chất lượng, setup CI/CD, cấu hình bảo mật, viết test, hoặc bất kỳ quyết định nào ảnh hưởng chất lượng/an ninh hệ thống.
---

# Quality Standards — Tiêu chuẩn Enterprise Vitasoft

## 1. Chính sách vòng đời dependency (KHÔNG EOL)

Chạy phần mềm trên nền tảng hết hỗ trợ = không có bản vá bảo mật = lỗ hổng tích lũy.

- **Runtime:** chỉ dùng Node.js phiên bản **Active LTS** (không dùng bản đã rơi xuống
  Maintenance — chỉ nhận security patch, không nhận bug fix). Tra endoflife.date/nodejs
  trước khi chọn. (Hiện tại: **Node 24** — Active LTS, EOL 04/2028. Node 22 đã chuyển
  Maintenance từ 10/2025 nên không dùng cho code mới.)
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

## 7. Convention & code documentation chuẩn

Code được đọc nhiều gấp 10 lần được viết — convention nhất quán và tài liệu đúng chỗ
giảm chi phí đọc cho cả người và AI agent.

- **Naming:** `camelCase` biến/hàm, `PascalCase` type/class/component, `kebab-case` tên file,
  `SCREAMING_SNAKE_CASE` hằng số. Tên nói rõ ý định (`remainingRetries` chứ không `n`).
- **TSDoc bắt buộc** cho mọi export public của package `core/`: mô tả 1 câu làm gì,
  `@param`/`@returns` khi không tự hiển nhiên, `@example` cho API phức tạp. Code nội bộ
  không export: chỉ comment khi giải thích **why** (ràng buộc, trade-off) — không comment
  kể lại **what** (dòng code đã tự nói).
- **ESLint + Prettier** là luật, không phải gợi ý: CI fail khi lint fail. Không tắt rule
  bằng `eslint-disable` mà không có comment giải thích lý do ngay cạnh.
- **Cấu trúc module nhất quán:** mỗi package/module theo cùng layout (src/, index.ts là
  public surface duy nhất, không import sâu vào file nội bộ của package khác).
- **README mỗi package:** mục đích, cách dùng 5 dòng, và những gì KHÔNG thuộc phạm vi.

## 8. Best practices & principles chuyên nghiệp

Nguyên tắc áp dụng khi viết và khi review — QA reviewer dùng làm checklist:

- **SOLID có chọn lọc:** Single Responsibility (một module một lý do để đổi) và
  Dependency Inversion (phụ thuộc interface, không phụ thuộc implementation) là bắt buộc;
  các nguyên tắc còn lại áp dụng khi hợp ngữ cảnh, không cuồng tín.
- **KISS > DRY > YAGNI theo thứ tự đó:** đơn giản trước; trùng lặp 2 lần chấp nhận được,
  lần 3 mới trừu tượng hoá; không xây cho nhu cầu tương lai giả định.
- **Fail fast, error rõ ràng:** validate input tại boundary rồi tin tưởng bên trong;
  error message nói rõ cái gì sai và cách sửa; không nuốt exception âm thầm.
- **Immutability mặc định:** `const`, `readonly`, không mutate tham số; state thay đổi
  được phải là quyết định có chủ đích.
- **Hàm nhỏ, thuần khi có thể:** side effect dồn ra rìa (I/O, DB), logic giữa là pure
  function — dễ test, dễ đạt coverage 90% thật.
- **Không magic:** số/chuỗi lặp lại có ý nghĩa → hằng số có tên; hành vi phụ thuộc config
  → khai báo trong `@vitasoft/config` schema, không đọc `process.env` rải rác.
- **Review chuẩn:** mọi thay đổi qua PR; PR nhỏ (<400 dòng thay đổi) để review chất lượng;
  commit message mô tả why.

## 9. Framework hiện đại, dễ scale & upgrade

- Ưu tiên framework có: upgrade path chính thức (codemods), release cadence ổn định,
  backward-compat policy rõ ràng. Hiện tại: Next.js (App Router), NestJS cho backend
  service phức tạp, Prisma cho DB.
- Tránh: fork thư viện, patch node_modules, phụ thuộc behavior không documented —
  tất cả làm upgrade sau này đắt gấp nhiều lần.
- Mọi lựa chọn framework mới phải qua `deep-research` (ma trận + EOL check) trước.
