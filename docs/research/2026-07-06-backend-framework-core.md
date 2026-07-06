# Framework backend tốt nhất 2026 cho `core/` và backend sản phẩm Vitasoft (Mind API, marketing services)

**Ngày:** 2026-07-06 | **Người yêu cầu:** huyvht8582@gmail.com (leader) | **Trạng thái:** khuyến nghị (cần leader chốt)
**Người thực hiện:** research-analyst (Vitasoft)

---

## TL;DR

Khuyến nghị **NestJS 11 (chạy trên adapter Fastify)** làm framework backend chuẩn cho `core/` và backend sản phẩm. Lý do: NestJS là framework duy nhất trong nhóm ứng viên đáp ứng đồng thời tất cả ràng buộc enterprise của Vitasoft — kiến trúc module + DI có cấu trúc rõ (hợp team nhỏ nhưng cần chuẩn enterprise, dễ scale khi thêm dev), hệ sinh thái chính thức đầy đủ (OpenAPI/Swagger, Prisma, `@nestjs/terminus`, OpenTelemetry module), và roadmap v12 (Q3/2026) đã cam kết đúng stack Vitasoft: **ESM mặc định, Vitest thay Jest, Standard Schema hỗ trợ Zod native, Rspack/oxlint** ([InfoQ, 04/2026](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/), truy cập 2026-07-06). Dùng adapter Fastify để lấy hiệu năng gần bằng Fastify thuần mà vẫn giữ cấu trúc Nest. Không ứng viên nào EOL trong 12 tháng tới nên không có ai bị loại vì vòng đời; các ứng viên còn lại bị loại vì lệch mục tiêu (Fastify: thiếu cấu trúc cho hệ nhiều service; Hono: định hướng edge, chưa phải sức mạnh trên K8s/Node truyền thống; Encore.ts: khóa hạ tầng/nền tảng, non-negotiable với chuẩn "upgrade path rõ" và tránh vendor lock-in). Rủi ro chính là **v12 breaking (ESM/Vitest migration)** — giảm thiểu bằng cách khởi tạo dự án ESM-first và Vitest ngay từ đầu để migration gần như không tốn công.

---

## 1. Câu hỏi & ràng buộc

**Quyết định:** Chọn 1 framework backend TypeScript làm chuẩn cho các service trong `core/` và backend sản phẩm Vitasoft (Mind API, marketing services).

**Ràng buộc (từ đề bài + `quality-standards`):**
- Monorepo TypeScript strict, pnpm workspaces + Turborepo, **Node 22 LTS**.
- Deploy đích: **GKE**, Docker multi-stage; DB **PostgreSQL + Prisma**, Redis.
- Coverage ≥90% với **Vitest**; E2E **Playwright**.
- **Dependency KHÔNG EOL / gần EOL (<12 tháng) = loại trực tiếp.**
- Dễ scale, upgrade path rõ ràng (codemods, backward-compat policy).
- Team nhỏ, ưu tiên tốc độ phát triển nhưng đạt chuẩn enterprise.

---

## 2. Vòng đời runtime (nền tảng cho mọi lựa chọn)

Mọi framework đều chạy trên Node.js, nên EOL runtime là ràng buộc gốc.

| Node.js | Trạng thái | Active hết | Security (EOL) hết |
|---|---|---|---|
| 20 | Maintenance LTS | 22/10/2024 | **30/04/2026** (đã/sắp EOL) |
| **22** (repo đang dùng) | Maintenance LTS | 21/10/2025 | **30/04/2027** |
| 24 | Active LTS | 20/10/2026 | 30/04/2028 |

Nguồn: [endoflife.date/nodejs](https://endoflife.date/nodejs) (truy cập 2026-07-06).

**Nhận xét:** Node 22 còn security support tới 04/2027 (>12 tháng) → hợp lệ theo quality-standards. Đúng như standard đã ghi: nên lên kế hoạch chuyển **Node 24** trước Q1/2027. Framework được chọn phải hỗ trợ tốt cả Node 22 và 24. Cả NestJS, Fastify, Hono đều hỗ trợ Node 22/24.

---

## 3. Ứng viên & dữ kiện (đã xác minh 2026-07-06)

### NestJS
- **Phiên bản hiện tại:** `@nestjs/core` **11.1.27** ([npm registry](https://registry.npmjs.org/@nestjs/core/latest), 2026-07-06). Publish gần nhất ~20 ngày trước ([npm @nestjs/core](https://www.npmjs.com/package/@nestjs/core), 2026-07-06).
- **Sức khỏe repo:** 76,040 sao, `pushed_at` 2026-07-06, 44 issue mở, không archived ([GitHub API nestjs/nest](https://api.github.com/repos/nestjs/nest), 2026-07-06). Commit trong ngày → maintain rất tích cực (maintainer chính: Kamil Myśliwiec).
- **Release cadence:** patch/minor liên tục (nhiều bản/tháng trong dòng 11.1.x) ([GitHub releases](https://github.com/nestjs/nest/releases), 2026-07-06).
- **Roadmap v12 (Q3/2026):** ESM mặc định, **Vitest thay Jest**, **Standard Schema** trên `@Body/@Query/@Param` (Zod/Valibot/ArkType native), **oxlint** thay ESLint, **Rspack** thay Webpack, NATS v3 ([InfoQ, 04/2026](https://www.infoq.com/news/2026/04/nestjs-12-roadmap-esm/); [PR #16391](https://github.com/nestjs/nest/pull/16391), 2026-07-06).
- **Hệ sinh thái:** `@nestjs/swagger` (OpenAPI), Prisma tích hợp qua provider, module OpenTelemetry chính thức + hướng dẫn ([SigNoz](https://signoz.io/blog/opentelemetry-nestjs/), 2026-07-06), `@nestjs/terminus` health check (chuẩn cho K8s liveness/readiness). Zod dùng được ngay qua pipe; v12 thành native. Chạy được trên **adapter Fastify** để tăng hiệu năng.
- **TS strict + Vitest:** hỗ trợ tốt; boilerplate NestJS + Prisma + Zod + Vitest đã phổ biến ([nest-http-prisma-zod](https://github.com/innei-template/nest-http-prisma-zod), 2026-07-06).

### Fastify
- **Phiên bản hiện tại:** **5.10.0** ([npm registry](https://registry.npmjs.org/fastify/latest), 2026-07-06).
- **Sức khỏe repo:** 36,618 sao, `pushed_at` 2026-07-05, 134 issue mở, không archived ([GitHub API fastify/fastify](https://api.github.com/repos/fastify/fastify), 2026-07-06). OpenJS Foundation project.
- **LTS/EOL policy:** v5 (ra 17/09/2024) target Node 20+/22; v4 hết LTS 30/06/2025. Major được support tối thiểu 6 tháng + 6 tháng security sau major kế tiếp ([Fastify LTS](https://fastify.dev/docs/latest/Reference/LTS/), 2026-07-06). v5 vẫn đang là dòng chính → không EOL trong 12 tháng.
- **Bảo mật:** đã có CVE được vá nhanh trong dòng 5.8.x (vd content-type validation) ([Fastify releases](https://github.com/fastify/fastify/releases), 2026-07-06) — quy trình security tốt.
- **Hệ sinh thái:** JSON Schema first-class → validation + serialization + OpenAPI "free"; TS support built-in; nhiều plugin chính thức. Prisma dùng bình thường; OpenTelemetry qua instrumentation.
- **Ghi chú:** "hiệu năng không còn là điểm khác biệt lớn" giữa các framework hiện đại ([Encore comparison](https://encore.dev/articles/best-typescript-backend-frameworks), 2026-07-06).

### Hono
- **Phiên bản hiện tại:** **4.12.27** ([npm registry](https://registry.npmjs.org/hono/latest), 2026-07-06).
- **Sức khỏe repo:** 31,237 sao, `pushed_at` 2026-07-04, 374 issue mở, không archived ([GitHub API honojs/hono](https://api.github.com/repos/honojs/hono), 2026-07-06). Cadence nhanh (patch hàng tuần/hai tuần), zero-dependency, dựa Web Standards.
- **Hệ sinh thái:** OpenAPI qua `@hono/zod-openapi` (Zod native, rất mạnh), middleware OpenTelemetry ([youngju.dev ecosystem 2026](https://www.youngju.dev/blog/culture/2026-05-16-typescript-ecosystem-bun-deno-hono-elysia-nestjs-effect-trpc-drizzle-prisma-zod-vitest-2026-deep-dive.en), 2026-07-06). Prisma dùng được. TS strict + Vitest rất hợp.
- **Định vị:** tối ưu **edge/serverless** (Cloudflare Workers, Deno, Bun, Lambda), bundle nhỏ <12kB, cold start thấp ([hono.dev](https://hono.dev/); [DEV 2026](https://dev.to/ottoaria/honojs-in-2026-the-fastest-web-framework-for-cloudflare-workers-and-why-its-going-mainstream-2aap), 2026-07-06). Chạy được trên Node/K8s nhưng đó không phải sức mạnh chính.

### Encore.ts (ứng viên nổi bật 2026)
- **Sức khỏe repo:** active, không archived ([GitHub encoredev/encore](https://github.com/encoredev/encore), 2026-07-06). Runtime Rust, quảng cáo nhanh ~9x Express ([Encore](https://encore.dev/articles/best-typescript-backend-frameworks), 2026-07-06).
- **K8s/GKE:** hỗ trợ GKE Autopilot/Standard, export Docker image self-host ([Encore K8s docs](https://encore.dev/docs/deploy/kubernetes), 2026-07-06).
- **Rủi ro:** mô hình "declarative infrastructure" gắn chặt với nền tảng/CLI Encore → **vendor lock-in cao**, upgrade path phụ thuộc một nhà cung cấp, lệch nguyên tắc "tránh phụ thuộc behavior không documented / upgrade rõ ràng" của quality-standards §7.

---

## 4. Ma trận quyết định có trọng số

Thang điểm 1–5. Trục "Vòng đời" là **cổng loại trực tiếp** (EOL <12 tháng = out) — cả 4 ứng viên đều qua cổng này, nên tính điểm bình thường.

| Tiêu chí | Trọng số | NestJS (+Fastify) | Fastify | Hono | Encore.ts |
|---|---:|:---:|:---:|:---:|:---:|
| Vòng đời (≥24 tháng, gate <12) | gate | Pass (5) | Pass (5) | Pass (5) | Pass (4) |
| Độ trưởng thành & cộng đồng | 5 | 5 | 4 | 4 | 2 |
| Scale & upgrade path (codemods, compat) | 5 | 5 | 4 | 4 | 2 |
| Hệ sinh thái (OpenAPI, Zod, Prisma, OTel) | 4 | 5 | 4 | 4 | 3 |
| Phù hợp stack (TS strict, Vitest, pnpm) | 4 | 5 | 4 | 5 | 3 |
| Chạy tốt trên GKE/Docker/K8s | 4 | 5 | 5 | 3 | 4 |
| Cấu trúc cho hệ nhiều service (team scale) | 4 | 5 | 3 | 3 | 4 |
| Hiệu năng | 3 | 4 | 5 | 5 | 5 |
| Chi phí học + vận hành (team nhỏ) | 3 | 3 | 4 | 4 | 3 |
| **Tổng có trọng số** (max 180) | | **154** | **135** | **131** | **106** |

Cách tính: điểm × trọng số, cộng dồn (trục gate không cộng điểm). NestJS dẫn đầu nhờ điểm mạnh ở các trục trọng số cao nhất: trưởng thành, upgrade path, hệ sinh thái, cấu trúc đa-service, phù hợp GKE.

---

## 5. Khuyến nghị

**Chọn: NestJS 11 (adapter Fastify), lộ trình lên v12 khi ổn định.**

NestJS là lựa chọn duy nhất cân bằng đủ 3 yêu cầu xung khắc của Vitasoft: chuẩn enterprise, tốc độ cho team nhỏ, và dễ scale khi hệ thống lớn dần (Mind API + nhiều marketing service). Kiến trúc module/DI cho ranh giới rõ giữa các service trong `core/`, hệ sinh thái chính thức (Swagger/OpenAPI, Prisma, terminus health-check cho K8s, OpenTelemetry) loại bỏ việc tự ghép thư viện lẻ. Roadmap v12 (Q3/2026) đưa NestJS về đúng stack Vitasoft — ESM, Vitest, Zod qua Standard Schema — nên đầu tư hôm nay không lỗi thời. Chạy trên adapter Fastify để thu hẹp khoảng cách hiệu năng với Fastify thuần mà vẫn giữ cấu trúc.

### Rủi ro chính & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| v12 breaking (ESM + Vitest thay Jest, Q3/2026) | Trung bình | Khởi tạo dự án **ESM-first + Vitest ngay từ đầu** (bỏ qua Jest). Khi v12 ra, migration gần như không tốn công. Theo dõi [PR #16391](https://github.com/nestjs/nest/pull/16391). |
| Boilerplate/độ phức tạp cao hơn Fastify/Hono với team nhỏ | Trung bình | Dùng Nest CLI + schematic; chuẩn hóa 1 module template dùng chung trong monorepo; giới hạn tính năng nâng cao (microservices, CQRS) đến khi thực sự cần. |
| Hiệu năng thấp hơn Fastify thuần | Thấp | Dùng `@nestjs/platform-fastify`; hiệu năng không còn là điểm khác biệt lớn ở workload API thông thường ([Encore](https://encore.dev/articles/best-typescript-backend-frameworks), 2026-07-06). |
| Phụ thuộc 1 maintainer chính (Kamil) | Thấp–TB | Repo có backing cộng đồng lớn (76k sao) + doanh nghiệp; theo dõi nhịp release qua Dependabot; có HeroDevs/ESS cho hệ OpenJS nếu cần. |

### Lý do loại (1 dòng mỗi phương án)

- **Fastify:** Xuất sắc cho single-service API nhưng thiếu cấu trúc/DI sẵn có cho hệ nhiều service — mà Vitasoft dùng nó *bên trong* NestJS như adapter, nên không mất gì.
- **Hono:** Định hướng edge/serverless (Web Standards, bundle nhỏ); mạnh nhất trên Cloudflare Workers/Deno/Bun, không phải điểm mạnh trên GKE/Node truyền thống — thừa cho use case container hóa của Vitasoft.
- **Encore.ts:** Declarative-infrastructure gắn chặt nền tảng Encore → vendor lock-in cao, vi phạm nguyên tắc "upgrade path rõ, tránh phụ thuộc không documented" (quality-standards §7).

---

## 6. Ghi chú độ tin cậy nguồn

- Dữ kiện phiên bản lấy từ **npm registry API** (chính thức); sức khỏe repo từ **GitHub API** (chính thức); EOL từ **endoflife.date** (chuẩn ngành). Roadmap v12 từ **InfoQ** (báo chí kỹ thuật) + **PR chính thức trên GitHub**.
- Một số nguồn hiệu năng/hệ sinh thái là blog (Encore, youngju.dev, DEV.to) — dùng làm bối cảnh xu hướng, không dùng làm dữ kiện vòng đời.
- **Chưa xác minh được:** weekly download tuyệt đối của từng package (npm UI trả 403 với WebFetch trong phiên này) — không dùng con số download làm căn cứ chấm điểm; thay bằng sao GitHub + nhịp commit đã xác minh.
- **Mâu thuẫn ngày tháng:** một vài WebFetch trả năm "2024" cho release notes do model đọc sai; đã đối chiếu chéo với npm/GitHub API (pushed_at 2026-07) để xác nhận các mốc thực là 2026.

---

*Báo cáo tạo bởi research-analyst theo skill `deep-research` + `quality-standards`. Mọi dữ kiện quan trọng kèm nguồn + ngày truy cập 2026-07-06.*
