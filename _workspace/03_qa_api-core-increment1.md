# QA Report — Phase 2a Increment 1: Backend Core API

**Ngày:** 2026-07-06 · **Agent:** qa-reviewer · **Phạm vi:** `api/`, `core/database/`, `core/http-kit/`, `docker-compose.yml`
**Môi trường:** Node v24.13.0 (Active LTS — đúng chính sách), pnpm 9.15.4 (qua corepack), Docker 29.6.1

**Kết luận: PASS (với 5 findings nhỏ, không blocker).**

---

## Bước 1 — Verification cơ bản (chạy thật)

### `pnpm typecheck` (toàn workspace)
```
Tasks:    12 successful, 12 total
Time:     5.127s
```
PASS — 12/12.

### `pnpm build`
```
Tasks:    7 successful, 8 total
Failed:   @vitasoft/homepage#build   (EPERM symlink, Next.js output: standalone)
```
- 3 package của increment build sạch, có artifact: `api/dist/main.js`, `core/database/dist/index.js`, `core/http-kit/dist/index.js`.
- Fail duy nhất là `@vitasoft/homepage` — lỗi Windows EPERM symlink tiền tồn, KHÔNG thuộc increment này (đã loại trừ theo yêu cầu). Scoped build 3 package: 5/5 tasks pass.

### `pnpm test` + coverage (đo per-file qua json-summary, không tin con số tổng)
| Package | Test Files | Tests | Lines | Funcs | Branch | Files đo |
|---|---|---|---|---|---|---|
| core/database | 1 | 6 | 100 | 100 | 100 | 2 (client.ts, index.ts) |
| core/http-kit | 3 | 15 | 100 | 100 | 96.42 | 4 |
| api | 8 | 30 | 100 | 100 | 100 | 15 |
| **Tổng** | **12** | **51** | | | | |

**51 tests pass** — khớp báo cáo builder. Tất cả ≥ ngưỡng (90 lines / 90 funcs / 85 branch).
Đã xác minh coverage đo THẬT source (15 file api liệt kê từng file 100%), không phải "All files 100%" rỗng.

### `pnpm audit --audit-level high`
```
2 vulnerabilities found — Severity: 2 moderate
exit 0
```
PASS gate bảo mật — không có CVE high/critical. (2 moderate: leader cân nhắc theo dõi, không blocker.)

---

## Bước 2 — So sánh chéo điểm tiếp giáp (mở cả hai phía)

| # | Ranh giới | Kết quả |
|---|---|---|
| 1 | Domain PORT ↔ Prisma ADAPTER | **KHỚP.** 4 method (`create/findById/existsBySlug/list`) trùng chữ ký. Adapter map row→`Organization` entity qua `toDomain`, KHÔNG leak Prisma model ra domain. |
| 2 | Presentation ↔ Application | **KHỚP.** Controller dispatch đúng `CreateOrganizationCommand(slug,name)` / `GetOrganizationQuery(id)` / `ListOrganizationsQuery()`. DTO zod shape (`slug`,`name`) khớp command input; `toOrganizationResponse` map entity→wire (createdAt ISO). |
| 3 | Application ↔ Domain | **KHỚP.** Handlers chỉ import `../../domain/*` + decorator CQRS. Không import infrastructure/prisma/HTTP. |
| 4 | Dependency rule (grep domain/) | **KHỚP.** `api/src/modules/organizations/domain/*` chỉ import nội bộ domain (+ vitest trong test). 0 import từ application/infra/presentation/nestjs/prisma. |
| 5 | Prisma schema ↔ adapter ↔ migration | **KHỚP.** Field `id/slug/name/createdAt` khớp `OrganizationRow` và mọi query. Migration có `organizations_slug_key` UNIQUE + bảng users khớp schema. |
| 6 | `@vitasoft/config` ↔ .env.example ↔ compose | **Chủ yếu khớp** — xem F-01, F-02, F-03. |
| 7 | http-kit exports ↔ api imports | **KHỚP.** api import `ZodValidationPipe`, `ProblemExceptionFilter`, `LoggingInterceptor` — đều nằm trong `index.ts` public surface. Không deep-import file nội bộ. |

---

## Bước 3 — Gate convention & principles (quality-standards §7-8)

- **TSDoc export public core/:** ĐỦ. `core/database/src/index.ts` + `client.ts` (factory/singleton có `@param`/`@returns`/`@example`); `core/http-kit` mọi export có TSDoc tại định nghĩa (filter, pipe, interceptor). README có ở cả 3 package.
- **Chất lượng assertion (đọc 6 test file):** THẬT, không padding. Kiểm chứng: wire shape, map 409/404, newest-first với timestamp xác định, error propagation không-domain, adapter row→entity + call-args, health degrade up/down, RFC 7807 reserved-`status` không bị clobber, unknown throw → 500 không leak internals.
- **Immutability:** entity `Organization` mọi field `readonly`, `private constructor` + `fromPersistence`. `NewOrganization`/`OrganizationResponse` readonly. Đạt.
- **Fail-fast tại boundary:** `ZodValidationPipe` fail-fast → 400 liệt kê field errors. Đạt (trừ F-01).
- **Naming / no magic:** hằng số có tên (`API_VERSION_PREFIX`, `DEFAULT_API_PORT`, `TRACE_HEADER`, `SINGLETON_KEY`). Đạt.
- **SRP/DIP:** PORT↔ADAPTER qua `@Inject(ORGANIZATION_REPOSITORY)` + `useClass`; in-memory fake chứng minh seam. Đạt.

---

## Bước 4 — Docker (Docker Desktop đang chạy)

- `docker compose config --quiet` → **VALID**.
- `docker compose up -d postgres redis` → cả hai **healthy** (postgres `pg_isready`, redis `redis-cli ping`) trong <60s.
- Dọn dẹp `docker compose down -v` → sạch (container/volume/network removed).

---

## Findings (mọi mức, kèm tin cậy — leader quyết sửa/bỏ qua)

### [SEVERITY: medium] core/database/src/client.ts:30 — DATABASE_URL không fail-fast qua config
**Mô tả:** `createPrismaClient` đọc `process.env.DATABASE_URL ?? ""` trực tiếp, KHÔNG qua `loadEnv()`. `getPrismaClient()` trong `PrismaService` gọi không truyền options → singleton tạo với `""` khi thiếu env.
**Kịch bản lỗi:** Deploy thiếu/sai `DATABASE_URL` → API vẫn boot (không fail-fast), `/health/live` 200, chỉ vỡ ở query đầu tiên → `/health/ready` 503. Validation `z.string().url()` trong config schema thành trang trí đối với client vì đường đi thực bỏ qua nó. Vi phạm nguyên tắc fail-fast-tại-boundary (quality-standards §8) cho config thực-tế-bắt-buộc.
**Tin cậy:** chắc chắn (đường đi code rõ). **Đề xuất:** inject connection string đã validate từ `loadEnv()` vào `getPrismaClient`, hoặc validate `DATABASE_URL` required khi service cần DB.

### [SEVERITY: low] api/src/modules/organizations/infrastructure/prisma-organization.repository.ts:26 — race slug-trùng → 500 thay vì 409
**Mô tả:** `CreateOrganizationHandler` check `existsBySlug` rồi `create` (TOCTOU). Schema có `slug @unique` nên hai request đồng thời cùng slug: request thứ 2 qua được check → Prisma ném `P2002` (unique violation) mà adapter/handler KHÔNG map sang `OrganizationSlugTakenError`.
**Kịch bản lỗi:** 2 POST `{slug:"acme"}` đồng thời → 1 cái 201, cái kia 500 (Prisma error rò ra global filter → Internal Server Error) thay vì 409 problem+json.
**Tin cậy:** chắc chắn (logic rõ; cửa sổ race hẹp). **Đề xuất:** catch `P2002` trong adapter `create` → ném `OrganizationSlugTakenError`. Ràng buộc unique ở DB vẫn đảm bảo tính đúng đắn dữ liệu.

### [SEVERITY: low] api/src/main.ts:47 — đọc process.env.PORT rải rác
**Mô tả:** `const port = process.env.PORT ? env.PORT : DEFAULT_API_PORT`. Đọc `process.env.PORT` thô để rẽ nhánh, dù `env.PORT` (đã validate + coerce number, default 3000) đã có. Vi phạm nhẹ "không đọc process.env rải rác" (quality-standards §8) và logic default trùng lặp (config default 3000 vs main default 3001).
**Kịch bản lỗi:** Không lỗi runtime (smoke test đã chứng minh 3001 hoạt động). Là mùi code: hai nguồn default cho cùng một giá trị, dễ lệch khi refactor.
**Tin cậy:** chắc chắn. **Đề xuất:** dùng thẳng `env.PORT` và đặt default 3001 ở một chỗ (config override hoặc hằng), bỏ đọc `process.env`.

### [SEVERITY: low] docker-compose.yml:42 vs api/.env.example — REDIS_URL khai báo lệch
**Mô tả:** compose set `REDIS_URL` cho api service, config schema có `REDIS_URL` (optional), nhưng `api/.env.example` KHÔNG khai báo `REDIS_URL`. Increment này chưa consume Redis (BullMQ/throttler là increment sau).
**Kịch bản lỗi:** Không lỗi chức năng. Dev copy `.env.example` sẽ thiếu `REDIS_URL` mà compose lại truyền — không nhất quán tài liệu, dễ nhầm khi increment sau dùng Redis.
**Tin cậy:** chắc chắn. **Đề xuất:** thêm dòng `REDIS_URL` (commented) vào `api/.env.example` để tài liệu đồng bộ với compose.

### [SEVERITY: low] core/database/vitest.config.ts:9 — coverage include hẹp cứng (client.ts, index.ts)
**Mô tả:** `include: ["src/client.ts", "src/index.ts"]` liệt kê cứng 2 file (đúng để loại generated client). Nhưng file source non-generated thêm sau vào `core/database/src/` sẽ KHÔNG bị đo coverage trừ khi cập nhật glob thủ công → gate 90% có thể xanh giả.
**Kịch bản lỗi:** Increment sau thêm `src/tenant-scope.ts` (middleware tenant) không có test → coverage vẫn báo 100% vì file đó ngoài include → gate lọt.
**Tin cậy:** khả nghi (chỉ thành vấn đề khi thêm file mới). **Đề xuất:** đổi sang `include: ["src/**/*.ts"]` + `exclude: ["src/generated/**"]` để mặc định-bao-phủ, chỉ loại generated.

---

## Verified sạch — đã chạy

typecheck (12/12), build (3 package increment + artifacts), test+coverage (51 tests, per-file đo thật ≥ ngưỡng), pnpm audit (no high/critical), docker compose config+up+health+down. So 7 ranh giới: 6 khớp hoàn toàn, 1 (config/env) có 3 finding nhỏ. Assertion quality: THẬT. Immutability/DIP/fail-fast/naming: đạt.

**Không có finding severity cao/blocker.** 5 findings nhỏ (1 medium về fail-fast DATABASE_URL, 4 low) — đề nghị builder xử lý F-01 (medium) và F-02 (race 409) trong increment 2 khi làm tenant/auth; F-03/F-04/F-05 là dọn nhẹ tùy leader.
