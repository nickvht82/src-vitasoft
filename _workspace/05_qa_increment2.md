# QA Report — Phase 2a Increment 2: Auth + Multi-tenancy + Observability + Jobs

**Ngày:** 2026-07-07 · **Agent:** qa-reviewer · **Phạm vi:** `core/auth`, `core/observability`, `core/jobs`, `core/database` (tenant-scope + schema), `core/config`, `api/src/modules/{auth,jobs}`, `api/src/infrastructure/tenant`, file api sửa, `docker-compose.yml`
**Môi trường:** Node v24.13.0 (Active LTS — đúng chính sách), pnpm 9.15.4 (corepack), Docker 29.6.1, Postgres 17 + Redis 7

**Kết luận: PASS-với-findings.** Verification cơ bản xanh toàn bộ, auth/tenant-read/jobs/OTel end-to-end đúng, 5 fix inc.1 là fix THẬT. **Nhưng có 1 finding HIGH (IDOR đọc job không cần auth) và 1 MEDIUM (tenant-scope không chặn single-record update/delete cross-tenant) — cả hai xác minh bằng probe thật trên DB/HTTP live.** Không có finding nào chặn build, nhưng HIGH cần sửa trước khi jobs mang dữ liệu thật.

---

## Bước 1 — Verification cơ bản (chạy thật, output nguyên văn)

### `pnpm turbo run typecheck --force`
```
Tasks:    18 successful, 18 total
```
PASS — khớp báo cáo builder (18/18), không có `error TS`.

### `pnpm turbo run build --force`
```
@vitasoft/admin:build:    ✓ Compiled successfully in 5.8s
@vitasoft/homepage:build: ✓ Compiled successfully in 1788ms
Tasks:    11 successful, 11 total
```
PASS — 11/11. WARNING `IO error ... setting link name` (Next.js standalone symlink trên Windows) là cảnh báo nền tảng tiền tồn từ inc.1, KHÔNG fail, ngoài increment.

### `pnpm turbo run test --force`
```
@vitasoft/database:test:      Tests 16 passed (16)
@vitasoft/observability:test: Tests  9 passed (9)
@vitasoft/jobs:test:          Tests 12 passed (12)
@vitasoft/http-kit:test:      Tests 15 passed (15)
@vitasoft/auth:test:          Tests 20 passed (20)
@vitasoft/api:test:           Tests 56 passed (56)
Tasks:    16 successful, 16 total
```
**128 tests pass** (16+9+12+15+20+56) — khớp builder.

### Coverage (chạy `vitest run --coverage` từng package, đọc summary thật)
| Package | Lines | Funcs | Branches | Gate 90/90/85 |
|---|---|---|---|---|
| @vitasoft/auth | 100% (39/39) | 100% (9/9) | 100% (22/22) | PASS |
| @vitasoft/observability | 100% (12/12) | 100% (3/3) | 100% (14/14) | PASS |
| @vitasoft/jobs | 100% (18/18) | 100% (4/4) | 100% (18/18) | PASS |
| @vitasoft/database | 100% (24/24) | 100% (7/7) | 100% (17/17) | PASS |
| @vitasoft/api | 100% (137/137) | 98.24% (56/57) | 96.55% (56/58) | PASS |

Con số api khớp builder (100/98.24/96.55). **Lưu ý scope coverage** (xem F-inc2-04): coverage ĐO THẬT các file được đo, nhưng các file wiring third-party bị exclude hợp lý (`observability.ts`, `auth.ts`, `ai-tasks.queue.ts`, `main.ts`) — được smoke-test bù. Assertion quality của phần được đo là THẬT (đọc test config/roles/guard: assert hành vi, không padding).

### `pnpm audit --audit-level high`
```
2 vulnerabilities found — Severity: 2 moderate
exit=0
```
PASS gate bảo mật — không CVE high/critical. 2 moderate tiền tồn từ inc.1 (Dependabot theo dõi, không blocker).

---

## Bước 2 — Xác nhận 5 fix của findings inc.1 (đọc code + smoke)

| # | Finding inc.1 | Trạng thái | Bằng chứng (fix THẬT, không hình thức) |
|---|---|---|---|
| F-01 | DATABASE_URL fail-fast qua config | **FIX THẬT** | `core/database/client.ts` nhận `datasourceUrl` required (ném lỗi nếu rỗng), KHÔNG đọc `process.env`. `prisma.service.ts::resolveDatabaseUrl()` lấy từ `loadEnv()`, ném lỗi rõ ràng khi absent (fail-fast tại boundary). |
| F-02 | P2002→409 kèm test | **FIX THẬT** | `prisma-organization.repository.ts` catch P2002 (structural check, không import Prisma error class) → `OrganizationSlugTakenError` → controller `ConflictException` 409. Smoke live: `dup-slug 409`. |
| F-03 | PORT tập trung qua config | **FIX THẬT** | `main.ts` — `loadEnv(process.env.PORT ? undefined : { PORT: DEFAULT_API_PORT })`; default 3001 chảy qua zod validation, không còn `process.env.PORT` thô rẽ nhánh listen. |
| F-04 | REDIS_URL vào api/.env.example | **FIX THẬT** | `api/.env.example:11` có `REDIS_URL="redis://localhost:6379"` (chú thích session + BullMQ). |
| F-05 | coverage include glob | **FIX THẬT** | `core/database/vitest.config.ts` → `include: ["src/**/*.ts"]`, `exclude: ["src/generated/**", ...]`. `tenant-scope.ts` mới bị đo thật (đạt 100%). |

Tất cả 5 fix là thực chất, không phải trang trí. Kèm test/smoke chứng minh.

---

## Bước 3 — So sánh chéo điểm tiếp giáp (trọng tâm)

| # | Ranh giới | Kết quả |
|---|---|---|
| 1 | better-auth schema ↔ schema.prisma ↔ migration | **KHỚP.** 7 bảng (organizations/users/sessions/accounts/verifications/members/invitations) + cột theo better-auth 1.6 canonical. `sessions.activeOrganizationId`, `members.role default 'member'`, `users.organizationId nullable`. Migration SQL khớp từng cột/index/FK. |
| 2 | AuthGuard ↔ better-auth session | **KHỚP.** Guard build `Headers` từ Fastify raw headers → `auth.api.getSession({headers})`; no session → 401. Session hết hạn/revoke: smoke chứng minh sign-out → cùng cookie 401 (revoke server-side thật). |
| 3 | RolesGuard ↔ organization plugin | **KHỚP + fail-CLOSED.** Role lấy từ `getActiveMemberRole` (members table). Route KHÔNG `@Roles()` → no-op allow (an toàn vì AuthGuard là gate auth per-route). Route CÓ `@Roles()` mà thiếu role/auth-context → `ForbiddenException` (fail-closed, KHÔNG fail-open). Unknown role → rank -1 → deny. **Lưu ý:** hiện KHÔNG có route nào gắn `@Roles()` (xem F-inc2-05). |
| 4 | Tenant CLS ↔ Prisma extension | **KHỚP cho READ, GAP cho single-write.** Context set bởi `TenantContextInterceptor` (đọc `AUTH_CONTEXT_KEY.organizationId`, chạy sau guard, trong CLS). Extension đọc `readTenantId(cls)`. Request KHÔNG có tenant → `tenantId undefined` → **silently unscoped** (thiết kế có chủ đích cho public/sign-up). Read + updateMany/deleteMany được scope; **single-record update/delete/upsert KHÔNG scope** — xem F-inc2-02 (MEDIUM). |
| 5 | `prisma.unscoped` usage | **SẠCH.** Grep toàn `api/src`: chỉ `auth.module.ts:50` dùng `prisma.unscoped` (better-auth quản bảng riêng, span tenants — hợp lý, TSDoc ghi rõ). Không có usage unscoped nào khác đáng ngờ. |
| 6 | Jobs auth (IDOR) | **POST /v1/jobs/echo: KHỚP** (AuthGuard, smoke `enqueue-no-cookie 401`, `with-cookie 202`). **GET /v1/jobs/:id: LEAK** — không guard, không scope → IDOR. Xem F-inc2-01 (HIGH). |
| 7 | config ↔ .env.example ↔ docker-compose | **KHỚP.** `BETTER_AUTH_SECRET` (schema `.min(32)` ✓ / .env.example ✓ / compose ✓), `REDIS_URL` (3 nơi ✓), `OTEL_EXPORTER_OTLP_ENDPOINT` (schema ✓ / .env.example commented ✓ / compose không set = console exporter, no crash — nhất quán). |
| 8 | Dependency rule | **SẠCH.** `organizations/domain/*` chỉ import nội bộ domain. `jobs/application/*` không import `@vitasoft/auth`/`nestjs-cls`/prisma. `TenantContextInterceptor` + auth guards nằm ở infrastructure/presentation (đúng). Nhỏ: jobs handler phụ thuộc concrete `AiTasksQueue` thay vì port (xem F-inc2-06 low). |

---

## Bước 4 — Security lens (OWASP, quality-standards §2) — probe thật trên live stack

- **Cookie flags** (Set-Cookie sign-in): `HttpOnly ✓`, `SameSite=Lax ✓`, `Path=/ ✓`, `Max-Age=604800`. `Secure` vắng — ĐÚNG cho dev HTTP; better-auth tự thêm `Secure` khi baseURL https (prod). **Điều kiện:** prod PHẢI dùng `BETTER_AUTH_URL` https để `Secure` kích hoạt.
- **BETTER_AUTH_SECRET min-length:** ENFORCED thật — `core/config` schema `z.string().min(32)`. Secret <32 ký tự → `loadEnv()` ném lỗi (fail-fast). (`resolveSecret()` chỉ check absent, nhưng min-32 đã chặn ở config.)
- **CSRF:** better-auth chặn request thiếu Origin (`APIError: Missing or null Origin`) → 403. Xác minh: sign-up không Origin → 403; có Origin khớp baseURL → 200. Bảo vệ CSRF hoạt động.
- **Session revoke:** sign-out xoá session server-side; cookie cũ → 401. Xác minh live.
- **Broken access control — 3 kịch bản probe thật:**
  1. **IDOR jobs (HIGH):** `GET /v1/jobs/1` KHÔNG cookie → **200** trả `{"result":{"echoed":"secret-from-alice"}}`. Kẻ tấn công vô danh enumerate id tuần tự (1,2,3…) đọc kết quả job + input người dùng khác. → F-inc2-01.
  2. **IDOR jobs cross-user:** Bob (user khác, không liên quan) đọc job của Alice → **200** cùng payload. → F-inc2-01.
  3. **Tenant cross-write (MEDIUM):** scoped client bound tenant A, `user.update({where:{id: userCủaB}})` → **SUCCEEDED** (đổi tên user của B thành "HACKED-BY-A"). Read isolation đúng (A chỉ thấy user A; ép where=B bị override), nhưng single-record write vượt tenant. → F-inc2-02.

---

## Bước 5 — Convention gate (quality-standards §7-8)

- **TSDoc export public 3 package mới:** ĐỦ. `createAuth`/`AuthGuard`/`RolesGuard`/`roleAtLeast`/`isRole` (auth), `startObservability`/`selectExporterMode`/`buildResourceAttributes` (observability), `createQueue`/`createWorker`/`parseRedisConnection` (jobs) đều có mô tả + `@param`/`@returns`/`@example`. README có ở cả 3 (purpose + usage 5 dòng).
- **index.ts là public surface duy nhất:** đạt (không deep-import file nội bộ package khác).
- **Assertion THẬT:** RolesGuard spec (allow/forbid/no-role/no-context — throw thật), config.test (blank endpoint, omit undefined attr), tenant-scope.test (override wins). Không padding coverage.
- **Immutability:** `AuthContext`/`ObservabilityConfig`/`EchoJobData` mọi field `readonly`; hằng số `as const`. Đạt.
- **Fail-fast:** DATABASE_URL/BETTER_AUTH_SECRET/REDIS_URL đều ném lỗi rõ ràng (cái gì thiếu + cách sửa) tại boundary. Đạt.
- **Naming/no magic:** `TENANT_KEY`, `TENANT_MODELS`, `AI_TASKS_QUEUE`, `ECHO_JOB`, `DEFAULT_API_PORT`, `PRISMA_UNIQUE_VIOLATION` — hằng có tên. Đạt.

---

## Bước 6 — Docker smoke độc lập (không tin báo cáo builder — tự chạy lại)

`docker compose up -d postgres redis` → cả hai healthy. `prisma migrate deploy` → 8 bảng. TRUNCATE data cũ. `pnpm --filter api build` → `dist/main.js`. `node dist/main.js` (env DATABASE_URL/REDIS_URL/BETTER_AUTH_SECRET/PORT) → `/health/live 200`.

Chuỗi HTTP thật (Origin header khớp baseURL):
```
me-no-cookie          401 (expect 401)
org-no-cookie         401 (expect 401)
sign-up-A             200
sign-in-A             200 cookie=yes
me-with-cookie        200 {"user":{...alice@a.co},"organizationId":null,"role":null}
create-org-A          201 {"slug":"acme",...}
dup-slug              409 (expect 409)   ← F-02 e2e
enqueue-no-cookie     401 (expect 401)
enqueue-with-cookie   202 {"jobId":"1"}
job-read-NO-cookie    200 {"result":{"echoed":"secret-from-alice"}}   ← IDOR (F-inc2-01)
alice-job-read-by-Bob 200 {"result":{"echoed":"secret-from-alice"}}   ← IDOR cross-user
unknown-job           404 (expect 404)
```
Tenant isolation (scoped client `@vitasoft/database` thật, live DB):
```
tenant-A findMany -> 2 users, all A: true
tenant-A forcing where=B -> 2 rows, none are B (override wins): true
tenant-B findMany -> 1 users, all B: true
tenant-A update B's user by id -> SUCCEEDED (cross-tenant update NOT blocked)   ← F-inc2-02
```
OTel: console span exporter hoạt động thật (log spans `better-auth 1.6.23`, `POST /sign-in/email`) — **không crash khi thiếu OTLP endpoint** (acceptance criterion đạt).

`docker compose down -v` → sạch (container/volume/network removed). File tạm đã xoá.

---

## Findings (mỗi finding: severity + file:line + mô tả + kịch bản + tin cậy)

### [SEVERITY: HIGH] api/src/modules/jobs/presentation/jobs.controller.ts:57-68 — IDOR: GET /v1/jobs/:id không auth, không scope
**Mô tả:** `GET /v1/jobs/:id` KHÔNG có `@UseGuards(AuthGuard)` và KHÔNG scope theo user/tenant. `GetJobStatusHandler` trả `result` (job.returnvalue) + `failedReason` cho bất kỳ ai. BullMQ id tuần tự (`"1"`, `"2"`…).
**Kịch bản lỗi:** Kẻ tấn công VÔ DANH gọi `GET /v1/jobs/1`, `/2`, `/3`… đọc kết quả + input người dùng khác. Probe live: không cookie → 200 `{"echoed":"secret-from-alice"}`; user Bob (không liên quan) đọc job của Alice → 200. Khi jobs mang AI output từ input riêng tư (đúng mục đích `ai-tasks`), đây là rò rỉ dữ liệu nghiêm trọng (OWASP A01 Broken Access Control).
**Tin cậy:** CHẮC CHẮN (probe thật xác nhận 200 với payload). **Đề xuất:** thêm `@UseGuards(AuthGuard)`; lưu `userId`+`organizationId` vào job data lúc enqueue, và `getStatus` chỉ trả job nếu thuộc caller (so `job.data.userId === auth.user.id` hoặc `organizationId` khớp) — nếu không, 404 (không 403, tránh lộ tồn tại).

### [SEVERITY: MEDIUM] core/database/src/tenant-scope.ts:102-116 — single-record update/delete/upsert KHÔNG được tenant-scope
**Mô tả:** Extension chỉ scope READ_OPERATIONS + BULK_WRITE (updateMany/deleteMany). `update`/`delete`/`upsert` by unique "fall through unscoped" (có comment chủ ý). Với model tenant-scoped, caller biết id của tenant khác có thể mutate/xoá cross-tenant.
**Kịch bản lỗi:** Probe live: scoped client bound tenant A, `user.update({where:{id: userCủaB}, data:{name:"HACKED-BY-A"}})` → THÀNH CÔNG, đổi tên user của B. Hiện chưa có route sản phẩm nào làm single-record write trên `User` qua scoped client, nên phơi nhiễm là **latent** — nhưng mâu thuẫn acceptance "tenant isolation tuyệt đối" và sẽ thành HIGH ngay khi thêm route như vậy.
**Tin cậy:** CHẮC CHẮN (probe thật + đọc code). **Đề xuất:** scope cả `update`/`delete`/`upsert` (chuyển where-by-unique thành updateMany/deleteMany có `organizationId`, hoặc verify-then-write), HOẶC ghi TSDoc cảnh báo rõ + guideline "single-record write phải qua updateMany-with-tenant". Tối thiểu: test khẳng định hành vi hiện tại để không bị hiểu nhầm là an toàn.

### [SEVERITY: LOW] api/src/modules/auth/auth.module.ts:15,54 — đọc process.env thô (BETTER_AUTH_URL, AUTH_TRUSTED_ORIGINS) ngoài config schema
**Mô tả:** `process.env.BETTER_AUTH_URL` và `process.env.AUTH_TRUSTED_ORIGINS` đọc trực tiếp, không qua `@vitasoft/config` zod schema. Vi phạm nhẹ §8 "không đọc process.env rải rác; config → khai báo trong schema".
**Kịch bản lỗi:** Không lỗi runtime. Là mùi code: 2 env quan trọng cho auth/CSRF không được validate tập trung; typo/URL sai không fail-fast tại config boundary. `AUTH_TRUSTED_ORIGINS` sai định dạng → CSRF cho frontend vỡ âm thầm.
**Tin cậy:** CHẮC CHẮN. **Đề xuất:** thêm `BETTER_AUTH_URL` (z.string().url().optional()) và `AUTH_TRUSTED_ORIGINS` vào config schema.

### [SEVERITY: LOW] core/observability/vitest.config.ts:13-17 — observability.ts (logic không-crash) bị exclude khỏi coverage
**Mô tả:** `startObservability()` — hàm chứa chính logic "thiếu endpoint → ConsoleSpanExporter, không crash" — bị exclude coverage; chỉ `config.ts` (pure `selectExporterMode`) được đo. Coverage 100% của package KHÔNG bao gồm nhánh runtime thật của SDK.
**Kịch bản lỗi:** Không lỗi (smoke đã chứng minh console exporter chạy thật, không crash). Nhưng gate coverage không bảo vệ regression trong `observability.ts` (vd. lỡ đổi thành throw khi thiếu endpoint sẽ không bị test bắt). Exclude hợp lý (starts process-wide SDK) nhưng là gap có chủ đích cần ghi nhận.
**Tin cậy:** KHẢ NGHI (chỉ thành vấn đề khi regress). **Đề xuất:** giữ exclude nhưng thêm smoke assertion tự động (hoặc integration test) rằng `startObservability` với endpoint=undefined không ném; hoặc tách nhánh chọn-exporter thành pure function đã test (đã có `selectExporterMode` — chỉ cần assert `startObservability` gọi đúng).

### [SEVERITY: LOW] api/src/modules/auth/*, jobs — RBAC 403 chưa được wire vào route thật nào
**Mô tả:** RolesGuard + `@Roles()` được xây và unit-test đầy đủ (5 test, fail-closed), nhưng grep `@Roles(` toàn `api/src` → 0 route sử dụng. Acceptance "RBAC 401/403 đúng" đạt ở mức guard-logic nhưng KHÔNG có route e2e nào trả 403.
**Kịch bản lỗi:** Không lỗi hiện tại. Rủi ro: cơ chế RBAC chưa được kiểm chứng end-to-end với `getActiveMemberRole` thật (chỉ mock trong unit test) → khi wire route đầu tiên có thể lộ mismatch (vd. role string case, member chưa active org).
**Tin cậy:** CHẮC CHẮN (grep). **Đề xuất:** khi increment sau thêm route role-gated, kèm smoke 403 thật (member gọi route admin → 403). Ghi nhận descope hợp lý cho inc.2.

### [SEVERITY: LOW] api/src/modules/jobs/application/*.handler.ts — handler phụ thuộc concrete AiTasksQueue thay vì port
**Mô tả:** `EnqueueEchoHandler`/`GetJobStatusHandler` (application layer) import trực tiếp `AiTasksQueue` (infrastructure mở Redis). Khác với `organizations` dùng port/adapter qua DI token. Lệch nhẹ Clean Architecture/DIP (§8) so với chuẩn module organizations.
**Kịch bản lỗi:** Không lỗi. Application layer coupling vào infra concrete → khó thay queue impl và phải mock class thật khi test (spec hiện mock `.queue.getJob`). KISS cho demo queue chấp nhận được, nhưng không đồng nhất với chuẩn hexagonal của repo.
**Tin cậy:** CHẮC CHẮN. **Đề xuất:** tùy leader — nếu jobs sẽ mở rộng, tách port `JobQueue` interface + token; nếu giữ demo, chấp nhận (KISS).

### [SEVERITY: LOW / informational] api/src/modules/organizations/presentation/organizations.controller.ts:73,90 — GET org list/:id public, lộ mọi tenant (tiền tồn inc.1)
**Mô tả:** `GET /v1/organizations` và `GET /v1/organizations/:id` không AuthGuard → trả mọi org của mọi tenant cho caller vô danh (id/slug/name). Organization là tenant root (không scope). Tiền tồn từ inc.1, không phải regression inc.2.
**Kịch bản lỗi:** Vô danh liệt kê toàn bộ org (đếm khách hàng, đoán slug). Có thể là chủ ý (public org directory) nhưng nên là quyết định có ý thức.
**Tin cậy:** CHẮC CHẮN. **Đề xuất:** leader xác nhận org listing có định là public không; nếu không, thêm AuthGuard + scope theo membership.

---

## Verified sạch — đã chạy

typecheck (18/18), build (11/11), test (128 pass), coverage 5 package (≥90/90/85 thật, assertion THẬT), audit (no high/critical). So 8 ranh giới: 6 khớp hoàn toàn, ranh giới #4 (tenant single-write) và #6 (jobs read) có finding. 5 fix inc.1 = fix THẬT. Docker smoke độc lập: auth flow (sign-up/in/me/401/create-org/409/revoke), CSRF, tenant READ isolation, OTel no-crash, jobs enqueue-auth — TẤT CẢ đúng; IDOR đọc job + cross-tenant write — LỖI (probe thật xác nhận). Cookie HttpOnly/SameSite, secret min-32, session revoke — đạt. TSDoc/README/immutability/naming — đạt. Teardown `down -v` sạch.

**Blocker để leader quyết:** F-inc2-01 (HIGH IDOR jobs) nên sửa trước khi jobs mang dữ liệu thật (hiện echo demo nên chưa gây hại production data, nhưng pattern sai sẽ nhân bản). F-inc2-02 (MEDIUM tenant write-gap) sửa hoặc document rõ trước khi có route single-write trên model tenant-scoped. 5 finding LOW tùy leader.

---

## Re-verify (post-fix)

**Ngày:** 2026-07-07 · **Agent:** qa-reviewer · **Phạm vi:** RE-VERIFY targeted đúng 2 finding (F-inc2-01, F-inc2-02) sau khi builder sửa — KHÔNG QA lại toàn increment. Đọc code + regression toàn repo + smoke Docker độc lập cho từng finding.
**Môi trường:** Node v24.13.0, pnpm 9.15.4 (corepack), Docker 29.6.1, Postgres 17 + Redis 7.

### F-inc2-01 [HIGH] IDOR GET /v1/jobs/:id → **FIXED**

**Đọc code (chuỗi ownership đầy đủ, không hình thức):**
- `jobs.controller.ts:60-61` — `getStatus` giờ CÓ `@UseGuards(AuthGuard)` + `@ApiCookieAuth()`. `enqueueEcho` cũng `@UseGuards(AuthGuard)` (line 44-47).
- **ownerUserId KHÔNG giả mạo được:** controller inject `@CurrentUser() auth: AuthContext` (line 53, 66); `enqueueEcho` truyền `auth.user.id`/`auth.organizationId` vào command (line 55-56), `getStatus` truyền `auth.user.id` vào query (line 71). KHÔNG đọc từ `body`/`param`/`query` cho owner. `EnqueueEchoCommand` TSDoc + field readonly ghi rõ "từ authenticated request, không client input" (command.ts:7-9,13-16). `EchoJobData.ownerUserId` persist lên job (ai-tasks.queue.ts:17-27).
- **so owner → 404 không 403:** `get-job-status.handler.ts:26-27` — `if (data.ownerUserId !== query.callerUserId) return null`; unknown job cũng `return null` (line 23). Controller (jobs.controller.ts:72-76): `null` → `NotFoundException` 404. Comment rõ "mismatch = not found, không leak existence". Bob nhận CÙNG 404 như job không tồn tại → không phân biệt được.
- **Bug phụ builder tự phát hiện (ZodValidationPipe method-level → param-level):** đã đúng — `@Body(new ZodValidationPipe(enqueueEchoSchema))` param-level (line 52), chỉ validate body, không đụng `@CurrentUser()`.

**Smoke Docker độc lập (server dist thật, live Postgres+Redis, WebSession cookie thật — output nguyên văn):**
```
sign-up-Alice: 200
sign-up-Bob:   200
me-Alice:      200 {"user":{...alice3@a.co},"organizationId":null,"role":null}
enqueue-anon:  401 (expect 401)
enqueue-Alice: 202 {"jobId":"1"}
GET-anon:      401 (expect 401)
GET-Bob:       404 (expect 404)   ← cross-user read blocked, không leak existence
GET-Alice:     200 {"id":"1","state":"completed","result":{"echoed":"secret-from-alice",...}}  (expect 200)
GET-unknown:   404 (expect 404)
```
Cả 6 kịch bản khớp mong đợi. IDOR đóng: Alice đọc job của mình 200, Bob (user khác) 404 giống hệt job không tồn tại, vô danh 401. Khớp verification builder.

**Test mới (đọc spec):** `get-job-status.handler.spec.ts` — "returns null when the job belongs to another user (IDOR defense)" (line 31); `jobs.controller.spec.ts` — "maps another user's job to 404" (line 71), assert `command.ownerUserId === alice` (line 45, từ auth), `query.callerUserId === alice` (line 61). Assertion THẬT, không padding.

### F-inc2-02 [MEDIUM] cross-tenant single-write → **FIXED** (kèm 1 finding informational mới)

**Đọc code (`tenant-scope.ts`):**
- `SINGLE_WRITE_OPERATIONS = {update, delete, upsert}` (line 52-56) giờ đi CHUNG nhánh với READ + BULK_WRITE, tái dùng `withTenantWhere` để spread `organizationId` vào `where` (line 118-133). Tenant key spread cuối → luôn thắng, caller không override được.
- **create ĐÚNG là KHÔNG scope** (line 135-138): không có `where`, caller set key trong `data`. Fall-through có chủ đích, TSDoc ghi rõ.
- **Không bỏ sót op read:** `findUnique`/`findUniqueOrThrow` nằm trong READ_OPERATIONS (line 32-33) → single-record READ cũng scope, không leak. `updateMany`/`deleteMany` (BULK) đã đúng từ trước. Không còn op mutation nào lọt ngoài 3 set.

**Smoke Docker độc lập (scoped client `@vitasoft/database` thật + live DB, output nguyên văn):**
```
PASS - A.update(B) blocked (code=P2025)
PASS - B row unchanged after A update attempt (name=UB)
PASS - A.delete(B) blocked (code=P2025)
PASS - B row still present after A delete attempt
PASS - A.update(own) SUCCEEDED
PASS - A.upsert(B) blocked/threw (code=P2002)
PASS - A.delete(own) SUCCEEDED
PASS - read isolation intact (A sees only A's rows)
```
Bound tenant A: update/delete B qua id → P2025 (không match do where có `organizationId=A`), B nguyên vẹn. update/delete row chính A → thành công. Read isolation vẫn đúng. Boundary write giữ vững.

**Test mới (đọc spec `tenant-scope.test.ts`):** "PROVES cross-tenant write isolation: A cannot update/delete B's row by id", "a caller cannot override the tenant key on a single-record write either", đổi test cũ create/update. Coverage `@vitasoft/database` 100/100/100 (Stmts 25/25, Branch 18/18, Func 7/7 — nhánh SINGLE_WRITE mới ĐƯỢC ĐO).

### [SEVERITY: LOW / informational] tenant-scope.ts — upsert cross-tenant ném P2002 thay vì P2025
**Mô tả:** Khi A upsert trên id của B, `where {id: B, organizationId: A}` không match → upsert rẽ nhánh `create`, tạo record id=B → đụng unique constraint → **P2002** (không phải P2025 như update/delete).
**Kịch bản:** Security outcome ĐÚNG — B KHÔNG bị clobber, write cross-tenant bị chặn (smoke xác nhận). Nhưng error code không nhất quán (P2002 vs P2025); caller bắt lỗi "record not found" sẽ miss case upsert. Latent (chưa route nào upsert User qua scoped client).
**Tin cậy:** CHẮC CHẮN (smoke thật). **Đề xuất:** tùy leader — nếu upsert được dùng trên tenant model, cân nhắc verify-then-write hoặc TSDoc ghi rõ "upsert cross-tenant → P2002". Không blocker cho inc.2.

### Regression toàn repo (chạy thật, output tóm tắt)
| Bước | Kết quả | Gate |
|---|---|---|
| `turbo run typecheck --force` | Tasks 18/18 successful, no error TS | PASS |
| `turbo run build --force` | Tasks 11/11 (WARNING symlink Windows — pre-existing, không fail) | PASS |
| `turbo run test` | **134 pass** = database 19 + observability 9 + jobs 12 + auth 20 + http-kit 15 + api 59 (was 128; +3 database tenant-write, +3 api jobs IDOR) | PASS |
| coverage `@vitasoft/database` | 100/100/100 (Stmts 25, Branch 18, Func 7) | PASS ≥90/90/85 |
| coverage `@vitasoft/api` | Lines 100% / Stmts 98.62% / Branch 96.66% / Func 98.24% (tăng nhẹ vs 96.55% trước) | PASS ≥90/90/85 |
| `pnpm audit --audit-level high` | 2 moderate, 0 high/critical, exit 0 | PASS |

Không package nào gãy do 2 bản sửa. Test tăng 128→134 khớp builder. Coverage không tụt (api branch 96.55→96.66). Teardown `docker compose down -v` sạch; không stray file (`git status` xác nhận không có `_tenant_smoke`/`.env` rác).

### Kết luận Re-verify

| Finding | Trạng thái | Bằng chứng |
|---|---|---|
| F-inc2-01 [HIGH] IDOR jobs | **FIXED** | AuthGuard trên cả 2 route; owner từ `@CurrentUser` (không client input); mismatch→null→404 (không leak). Smoke: anon 401, Bob 404, Alice 200, unknown 404. |
| F-inc2-02 [MEDIUM] cross-tenant write | **FIXED** | update/delete/upsert inject `organizationId` vào where; create đúng là unscoped; read (findUnique) đã scope. Smoke: A↛B (P2025), A→A OK. |
| MỚI [LOW/info] upsert P2002≠P2025 | phát sinh từ bản sửa | outcome bảo mật đúng (B không clobber), chỉ error code không nhất quán. Latent, không blocker. |

**Kết luận tổng: READY-TO-COMMIT.** Cả 2 finding bảo mật đã vá THẬT (đọc code + smoke độc lập xác nhận), không tạo regression (134 test pass, coverage ≥90/90/85, audit sạch, build/typecheck xanh). 1 finding LOW/informational mới (upsert error-code) không chặn commit — tùy leader xử lý ở increment sau. 5 finding LOW tiền tồn từ QA gốc vẫn nguyên (tùy leader).
