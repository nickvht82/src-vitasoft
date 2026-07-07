# Builder Report — Phase 2a Increment 2: Auth + Multi-tenancy + Observability + Jobs

**Ngày:** 2026-07-07 · **Agent:** builder · **Chế độ:** AUDIT phiên trước (bị ngắt) rồi HOÀN THIỆN + VERIFY
**Môi trường:** Node v24.13.0 (Active LTS), pnpm 9.15.4 (corepack), Docker 29.6.1, Postgres 17 + Redis 7 (compose)

**Kết luận: PASS.** Phiên trước đã viết gần như trọn vẹn cả 5 hạng mục (P0–P4) ở chất lượng cao; nó chỉ dừng **trước bước verification cuối** (chưa có báo cáo này). Không cần viết lại phần nào. Việc của phiên này: audit đối chiếu spec, chạy verify đầy đủ (typecheck/build/test/coverage + smoke Docker thật), sửa 1 assertion sai trong smoke script của chính tôi, cập nhật change log.

---

## 1. Kết quả AUDIT (đối chiếu spec P0–P4)

Đọc toàn bộ source dở dang trên disk. **Mọi hạng mục đã hoàn chỉnh và đúng hướng thiết kế** — Clean Architecture giữ nguyên, TSDoc đầy đủ cho export public core/, fail-fast tại boundary, immutability. Không phát hiện phần viết dở hay thiếu hẳn.

### P0 — 5 QA findings: TẤT CẢ đã fix (xác minh từng cái)
| # | Finding | Trạng thái trên disk | Bằng chứng |
|---|---|---|---|
| F-01 | DATABASE_URL fail-fast qua config | ĐÃ FIX | `core/database/src/client.ts` — `createPrismaClient` nhận `datasourceUrl` **required**, ném lỗi nếu rỗng, KHÔNG đọc `process.env`. `api/.../prisma.service.ts::resolveDatabaseUrl()` lấy `DATABASE_URL` từ `loadEnv()`, fail fast khi absent. |
| F-02 | P2002→409 kèm test | ĐÃ FIX | `prisma-organization.repository.ts` catch `P2002` (structural check) → `OrganizationSlugTakenError` → controller map 409. Smoke test thật: dup slug trả **409**. |
| F-03 | PORT tập trung qua config default 3001 | ĐÃ FIX | `main.ts` — `loadEnv(process.env.PORT ? undefined : { PORT: DEFAULT_API_PORT })`; không còn đọc `process.env.PORT` thô để rẽ nhánh listen. |
| F-04 | REDIS_URL vào api/.env.example | ĐÃ FIX | `api/.env.example` có `REDIS_URL="redis://localhost:6379"` (kèm chú thích session store + BullMQ). |
| F-05 | coverage include glob | ĐÃ FIX | `core/database/vitest.config.ts` → `include: ["src/**/*.ts"]`, `exclude: ["src/generated/**", ...]`. Nhờ vậy `tenant-scope.ts` mới **bị đo** (đạt 100%). |

### P1 — `@vitasoft/auth`: HOÀN CHỈNH
- `createAuth()` (better-auth 1.6.23 + `prismaAdapter`), email/password + `organization` plugin, access-control roles **admin/operator/member** (creatorRole=admin).
- `AuthGuard` (validate session cookie → attach `AuthContext`, 401 khi không session), `RolesGuard` + `@Roles()` (hierarchy admin⊇operator⊇member, no-op nếu route không khai báo), `@CurrentUser()`.
- API wiring: `AuthModule` cung cấp `AUTH_INSTANCE` (dùng `prisma.unscoped` vì better-auth quản bảng riêng, span tenants), mount `/v1/auth/*` (catch-all bridge Fastify↔web Request), `/v1/auth/me`. `RolesGuard` global; `AuthGuard` per-route. POST /v1/organizations được `@UseGuards(AuthGuard)`.
- Schema better-auth (User/Session/Account/Verification/Member/Invitation) + migration đầy đủ.

### P2 — Tenant-scoping: HOÀN CHỈNH
- `core/database/src/tenant-scope.ts`: Prisma client extension `$allOperations`, `TENANT_MODELS=["User"]`, `TENANT_KEY="organizationId"`; scope reads + bulk writes (updateMany/deleteMany); tenant key **luôn thắng** (spread order); Organization (tenant root) không scope; unbound tenant → unscoped.
- CLS context: `ClsModule` (nestjs-cls) + `TenantContextInterceptor` seed `organizationId` từ AuthContext vào CLS; `PrismaService.client` là scoped client đọc tenant từ CLS. Domain không phải thread `organizationId`.
- Test chứng minh cô lập (9 test unit) + smoke DB thật (mục 3).

### P3 — `@vitasoft/observability`: HOÀN CHỈNH
- `startObservability()` — OTel `NodeSDK` auto-instrumentation (HTTP/Fastify/Prisma; tắt fs noise). Thiếu `OTEL_EXPORTER_OTLP_ENDPOINT` → console span exporter, **không crash**, metrics reader bỏ qua. `selectExporterMode`/`buildResourceAttributes` là pure, unit-test được.
- Init trong `main.ts` **trước** NestFactory; `shutdown()` graceful trên SIGTERM/SIGINT (swallow lỗi flush).

### P4 — `@vitasoft/jobs`: HOÀN CHỈNH
- `createQueue`/`createWorker` typed wrappers over BullMQ 5.79.2; `parseRedisConnection` (pure, `maxRetriesPerRequest:null`). Sản phẩm không import `bullmq` trực tiếp.
- API: `AiTasksQueue` (queue `ai-tasks` + in-process worker, graceful drain, REDIS_URL fail-fast), CQRS `EnqueueEchoHandler`/`GetJobStatusHandler`, `POST /v1/jobs/echo` (auth, 202) + `GET /v1/jobs/:id` (404 khi unknown).

**Quyết định đổi hướng:** KHÔNG. Giữ nguyên toàn bộ thiết kế phiên trước — nó nhất quán, đúng chuẩn, không có sai sót thật cần đổi.

---

## 2. VERIFICATION — output nguyên văn

### typecheck (fresh, `--force`)
```
Tasks:    18 successful, 18 total
```
Không có `error TS`. (13 package, một số có cả build+typecheck task.)

### build (fresh, `--force`)
```
@vitasoft/admin:build:    ✓ Compiled successfully in 5.9s
@vitasoft/homepage:build: ✓ Compiled successfully in 2.3s
Tasks:    11 successful, 11 total
```
Homepage/admin có WARNING `IO error: provided value is too long when setting link name` (Next.js standalone symlink trên Windows — **cảnh báo, không fail**; đây là vấn đề nền tảng Windows tiền tồn từ inc.1, không thuộc increment). Tất cả package backend build sạch.

### test + coverage (fresh, `turbo run test --force`)
```
@vitasoft/jobs:test:          Test Files 2 passed (2)   Tests 12 passed (12)
@vitasoft/database:test:      Test Files 2 passed (2)   Tests 16 passed (16)
@vitasoft/observability:test: Test Files 2 passed (2)   Tests  9 passed (9)
@vitasoft/http-kit:test:      Test Files 3 passed (3)   Tests 15 passed (15)
@vitasoft/auth:test:          Test Files 5 passed (5)   Tests 20 passed (20)
@vitasoft/api:test:           Test Files 14 passed (14) Tests 56 passed (56)
Tasks:    16 successful, 16 total
```
**128 tests pass** (12+16+9+15+20+56). Coverage per-package (text-summary, đo thật source):
| Package | Lines | Funcs | Branches | Gate 90/90/85 |
|---|---|---|---|---|
| @vitasoft/auth | 100% (39/39) | 100% (9/9) | 100% (22/22) | PASS |
| @vitasoft/observability | 100% (12/12) | 100% (3/3) | 100% (14/14) | PASS |
| @vitasoft/jobs | 100% (18/18) | 100% (4/4) | 100% (18/18) | PASS |
| @vitasoft/database | 100% (24/24) | 100% (7/7) | 100% (17/17) | PASS |
| @vitasoft/api | 100% (137/137) | 98.24% (56/57) | 96.55% (56/58) | PASS |

### pnpm audit --audit-level high
```
2 vulnerabilities found — Severity: 2 moderate
```
PASS gate bảo mật (không high/critical). Giống inc.1 — 2 moderate tiền tồn, không blocker.

---

## 3. SMOKE TEST THẬT (Docker: Postgres 17 + Redis 7)

`docker compose up -d postgres redis` → cả hai **healthy** (`pg_isready`, `redis-cli ping`). `prisma migrate deploy` → 8 bảng (`organizations, users, sessions, accounts, verifications, members, invitations, _prisma_migrations`). API boot với dist thật (`node dist/main.js`).

### Health + auth flow (nguyên văn)
```
health/live:  200 {"status":"ok",...}
health/ready: 200 {"status":"ok","info":{"database":{"status":"up"}},...}
me-no-cookie:  401 (expect 401)     ← /v1/auth/me guard
org-no-cookie: 401 (expect 401)     ← POST /v1/organizations guard
sign-up-A:     200                  ← POST /v1/auth/sign-up/email
sign-in-A:     200                  ← POST /v1/auth/sign-in/email (cookie captured)
me-with-cookie: 200 -> {"user":{"id":"QrC0...","email":"alice@a.co","name":"Alice"},"organizationId":null,"role":null}
create-org-A:  201 -> {"id":"cmraf43n3...","slug":"acme","name":"Acme Corp","createdAt":"2026-07-07T08:59:40.527Z"}
dup-slug:      409 (expect 409)     ← F-02 verified end-to-end
```

### Tenant isolation (script chạy trên scoped client `@vitasoft/database` thật, live DB)
```
tenant-A sees 2 users, all belong to A: true
  -> B's rows leaked to A: false
tenant-B sees 1 users, all belong to B: true
tenant-A trying to force B filter returns 2 rows, none are B's: BLOCKED (override wins)
RESULT: TENANT ISOLATION PROVEN
```
Kịch bản: seed 2 org + user cho mỗi bên qua unscoped client; bind scoped client vào tenant A → `findMany({})` (không filter) chỉ trả user của A; đổi context sang B → chỉ trả user của B; caller cố ép `where organizationId=B` khi đang bind A → extension **override** thành A (trả 2 user của A, KHÔNG có row nào của B). Khớp đúng thiết kế "active tenant wins" (unit test `tenant-scope.test.ts` line 62).

### Jobs qua Redis thật (nguyên văn)
```
enqueue-no-cookie: 401 (expect 401)
enqueue:           202 -> {"jobId":"1"}
job-final-state:   completed
job-result:        {"echoed":"hello-from-smoke","processedAt":"2026-07-07T09:02:14.506Z"}
unknown-job:       404 (expect 404)
Redis keys: bull:ai-tasks:1, bull:ai-tasks:completed, bull:ai-tasks:meta, ...
```
Job thật round-trip qua Redis (BullMQ keys tồn tại), worker in-process consume → completed với result echo đúng.

---

## 4. Homepage build (Developer Mode — chỉ ghi nhận)
```
pnpm --filter @vitasoft/homepage build
✓ Compiled successfully in 1390ms
✓ Generating static pages (4/4)
```
Compile + generate static pages OK. WARNING symlink standalone (Windows) là cảnh báo, không fail. Không thay đổi gì homepage.

---

## 5. Quyết định kỹ thuật (của phiên trước, đã audit và đồng ý)
1. **better-auth dùng `prisma.unscoped`** (không tenant-scoped): đúng — better-auth tạo user tại sign-up **trước** khi có org, và tự quản bảng auth; scope nó sẽ vỡ sign-up. Tenant scope chỉ áp cho model sản phẩm (`TENANT_MODELS`).
2. **RolesGuard global, AuthGuard per-route**: RolesGuard no-op nếu không `@Roles()` → an toàn global; AuthGuard per-route giữ route công khai (GET org, health) vẫn public.
3. **PORT default 3001 qua config override** (F-03): default chảy qua zod validation thay vì magic ở call site; schema default 3000 dành cho frontend, API tự override 3001.
4. **tenant key override wins**: `withTenantWhere` spread enforced key **cuối** → caller không thể nới rộng ra tenant khác. Đây là guarantee bảo mật, không phải "0 rows".
5. **api vitest exclude `ai-tasks.queue.ts`**: file mở kết nối Redis thật + chạy worker → cover bằng smoke P4, không unit test (hợp lý, đã smoke thật ở mục 3).

## 6. Việc tôi sửa trong phiên này
- **1 assertion sai trong smoke script của chính tôi** (không phải bug sản phẩm): ban đầu tôi assert "caller ép filter B → 0 rows", nhưng hành vi đúng+bảo mật là "override thành A → trả rows của A, không có B". Sửa assertion cho khớp guarantee thật. **Không đụng source sản phẩm.**
- Cập nhật `CLAUDE.md` change log (1 dòng inc.2).
- File smoke tạm (`_tenant_isolation_smoke.mjs`, `.env` root gitignored) đã xóa sau khi verify.

## 7. Việc còn lại / Descope (trung thực)
- **KHÔNG có Playwright E2E cho increment này.** quality-standards §4 yêu cầu Playwright cho user flow quan trọng ở **app frontend**. Increment này thuần backend API (không UI); flow auth/tenant/jobs đã được smoke-test HTTP thật end-to-end. E2E frontend auth sẽ đi kèm khi admin/homepage tích hợp login — **descope hợp lý cho inc.2**, ghi nhận để phase sau.
- `@nestjs/throttler` rate limiting (research §6) + idempotency: research xếp "http-kit", nhưng **ngoài scope 5 hạng mục inc.2** → không làm. Để leader xếp increment sau.
- 2 moderate vulnerabilities (audit) tiền tồn từ inc.1 — theo dõi qua Dependabot, không blocker.
- WARNING symlink standalone trên Windows: vấn đề nền tảng dev-local, không ảnh hưởng build prod (Docker Linux). Không sửa (ngoài scope).

## 8. File đã tạo/sửa trong increment 2 (do phiên trước, tôi audit + verify)
**Core packages mới:**
- `core/auth/` (src: auth.ts, auth-context.ts, roles.ts, auth.guard.ts, roles.guard.ts, roles.decorator.ts, current-user.decorator.ts, index.ts + specs/tests; package.json, tsconfig.json, vitest.config.ts, README.md)
- `core/observability/` (src: observability.ts, config.ts, trace-context.ts, index.ts + tests; package.json, tsconfig, vitest, README)
- `core/jobs/` (src: queue.ts, connection.ts, index.ts + tests; package.json, tsconfig, vitest, README)

**Core sửa:**
- `core/database/src/client.ts` (F-01 datasourceUrl required), `tenant-scope.ts` + `tenant-scope.test.ts` (P2 mới), `index.ts` (export tenant-scope + auth models), `vitest.config.ts` (F-05), `schema.prisma` + migration + generated client (better-auth models)
- `core/config/src/index.ts` (BETTER_AUTH_SECRET + OTEL_EXPORTER_OTLP_ENDPOINT)

**API sửa/mới:**
- `api/src/main.ts` (F-03 PORT, OTel init + graceful shutdown), `app.module.ts` (ClsModule + TenantContextInterceptor + Auth/Jobs modules)
- `api/src/infrastructure/tenant/` (tenant-context.ts, tenant-context.interceptor.ts + spec) — mới
- `api/src/infrastructure/database/prisma.service.ts` + spec (F-01 fail-fast, scoped client, unscoped getter)
- `api/src/modules/auth/` (auth.module, auth.controller, me.controller + specs) — mới
- `api/src/modules/jobs/` (ai-tasks.queue, application/*, presentation/* + specs) — mới
- `api/src/modules/organizations/` (controller AuthGuard + 409 map, repository P2002→409 + specs) — sửa
- `api/.env.example` (F-04 REDIS_URL + BETTER_AUTH_SECRET + OTEL), `api/vitest.config.ts` (exclude ai-tasks.queue)

**Root:** `docker-compose.yml` (api service env BETTER_AUTH_SECRET), `CLAUDE.md` (change log inc.2 — do phiên này), `pnpm-lock.yaml`.

---

*Báo cáo bởi builder theo skill `product-build` + `quality-standards`. Verify thật: typecheck 18/18, build 11/11, 128 tests coverage ≥90/90/85, audit no-high, smoke Docker (auth/tenant/jobs) end-to-end. Đề nghị qa-reviewer re-verify các điểm tiếp giáp auth↔tenant↔jobs.*

---

## Security fixes (post-QA)

**Ngày:** 2026-07-07 · **Chế độ:** sửa 2 finding QA (`_workspace/05_qa_increment2.md`) TRƯỚC khi commit.
**Môi trường:** Node v24.13.0, pnpm 9.15.4 (corepack), Docker 29.6.1, Postgres 17 + Redis 7.

### Finding 1 — [HIGH] IDOR trên `GET /v1/jobs/:id` — ĐÃ SỬA

**Đã sửa gì:** endpoint đọc job giờ (a) yêu cầu auth (401 khi không cookie) và (b) chỉ trả job
thuộc về caller; job của người khác trả **404** (không 403 — không lộ sự tồn tại của job).

**Cách sửa (Clean Architecture giữ nguyên — auth ở presentation, ownership ở application):**
- `jobs.controller.ts`: `getStatus` thêm `@UseGuards(AuthGuard)` + `@ApiCookieAuth()`; cả 2 route
  inject `@CurrentUser() auth: AuthContext`. `enqueueEcho` truyền `auth.user.id` + `auth.organizationId`
  vào command; `getStatus` truyền `auth.user.id` vào query.
- `enqueue-echo.command.ts`: thêm `ownerUserId` + `ownerOrganizationId` (readonly, từ auth context —
  KHÔNG từ client input).
- `ai-tasks.queue.ts` `EchoJobData`: thêm `ownerUserId` + `ownerOrganizationId` (persist owner lên job).
- `enqueue-echo.handler.ts`: lưu owner vào `queue.add`.
- `get-job-status.query.ts` / `get-job-status.handler.ts`: query mang `callerUserId`; handler so
  `job.data.ownerUserId === callerUserId`, mismatch → `null` → controller render 404 (IDOR defense).
- **Bug phụ phát hiện & sửa khi smoke:** `@UsePipes(ZodValidationPipe)` ở **method-level** chạy pipe
  lên MỌI param — khi thêm `@CurrentUser()`, pipe validate cả AuthContext → body `text` báo undefined.
  Sửa: đổi sang **param-level** `@Body(new ZodValidationPipe(enqueueEchoSchema))` (chỉ validate body).

**Test mới thêm (`api`):**
- `get-job-status.handler.spec.ts`: "returns null when the job belongs to another user (IDOR defense)"
  + mọi job trong spec giờ mang `data.ownerUserId`; query mang `callerUserId`.
- `jobs.controller.spec.ts`: khẳng định command mang `ownerUserId`/`ownerOrganizationId` từ auth
  (không từ body); query mang `callerUserId`; "maps another user's job to 404".
- `enqueue-echo.handler.spec.ts`: persist owner vào `queue.add`; case owner không có org (undefined tenant).

**Verification live (Docker, output nguyên văn):**
```
enqueue-anon:        401 (expect 401)
enqueue-Alice:       {"jobId":"1"}
GET-by-anon:  {"...title":"Unauthorized","status":401...}[401] (expect 401)
GET-by-Bob:   {"...title":"Not Found","status":404,"detail":"Job \"1\" not found."...}[404] (expect 404)
GET-by-Alice: {"id":"1","state":"completed","result":{"echoed":"secret-from-alice",...}} [200] (expect 200)
GET-unknown:  {"...status":404,"detail":"Job \"999999\" not found."...}[404] (expect 404)
```

### Finding 2 — [MEDIUM] tenant-scope không chặn single-record write cross-tenant — ĐÃ SỬA

**Đã sửa gì:** single-record mutation (`update`/`delete`/`upsert`) trên TENANT_MODELS giờ được inject
tenant filter vào `where`. Row của tenant khác không match → Prisma ném **P2025** (Record not found) →
write không vượt được tenant boundary.

**Cách sửa (phương án inject filter minh bạch — Prisma 7 client extension đúng đắn, không hack):**
- `core/database/src/tenant-scope.ts`: thêm `SINGLE_WRITE_OPERATIONS = {update, delete, upsert}`; các op
  này đi cùng nhánh với READ/BULK_WRITE, tái dùng `withTenantWhere` để spread `organizationId` (enforced
  key luôn thắng vì spread cuối). Dựa trên khả năng của Prisma: `UserWhereUniqueInput` chấp nhận thêm
  scalar filter (`organizationId`) bên cạnh unique key (`id`/`email`) — xác minh trong generated model
  (`AtLeast<{ id?, email?, ..., organizationId? }, "id"|"email">`). `create` vẫn không scope (không có
  `where`; caller set tenant key trong `data`). TSDoc cập nhật.

**Test mới thêm (`core/database` — `tenant-scope.test.ts`):**
- "scopes single-record mutations (update / delete / upsert)" — inject key, giữ điều kiện caller.
- "PROVES cross-tenant write isolation: A cannot update/delete B's row by id" — key pin về A, không B.
- "a caller cannot override the tenant key on a single-record write either" — override wins cho write.
- Đổi test cũ "create/update" → "create (no where...)" cho đúng hành vi mới.

**Verification live (scoped client thật + DB thật, output nguyên văn):**
```
=== TENANT CROSS-WRITE SMOKE (scoped client, live DB) ===
  A.update(B) threw: PrismaClientKnownRequestError P2025
PASS - A cannot UPDATE B's row by id (threw + B unchanged)
  A.delete(B) threw: PrismaClientKnownRequestError P2025
PASS - A cannot DELETE B's row by id (threw + B still present)
PASS - A CAN update its own row by id
PASS - A CAN delete its own row by id
```

### Verify tổng (Docker, nguyên văn tóm tắt)
```
typecheck: Tasks 18 successful, 18 total (no error TS)
build:     Tasks 11 successful, 11 total (WARNING symlink Windows — pre-existing, không fail)
test:      database 19, api 59, auth 20, jobs 12, observability 9, http-kit 15 = 134 pass (was 128)
coverage:  @vitasoft/database 100/100/100 ; @vitasoft/api lines 100% stmts 98.62% branch 96.66% funcs 98.24% (≥90/90/85 PASS)
audit:     2 moderate, 0 high/critical (exit 0) — PASS
docker:    postgres+redis healthy → migrate deploy → smoke jobs + tenant-write → down -v sạch
```

### File sửa (post-QA)
- `core/database/src/tenant-scope.ts`, `core/database/src/tenant-scope.test.ts`
- `api/src/modules/jobs/ai-tasks.queue.ts`
- `api/src/modules/jobs/application/enqueue-echo.command.ts` · `enqueue-echo.handler.ts` · `enqueue-echo.handler.spec.ts`
- `api/src/modules/jobs/application/get-job-status.query.ts` · `get-job-status.handler.ts` · `get-job-status.handler.spec.ts`
- `api/src/modules/jobs/presentation/jobs.controller.ts` · `jobs.controller.spec.ts`
- `CLAUDE.md` (change log — 1 dòng security fix inc.2)

*2 finding QA đã vá + verify live. Đề nghị qa-reviewer re-verify F-inc2-01 (IDOR jobs) và F-inc2-02 (tenant write-gap).*
