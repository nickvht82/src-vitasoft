# Builder Report — Phase 2a Increment 1: Backend Core API

**Ngày:** 2026-07-06 · **Agent:** builder · **Trạng thái:** Hoàn thành, verification pass

Scaffold backend core API theo Clean Architecture / Hexagonal (Ports & Adapters)
với Repository Pattern, DI/IoC (NestJS container), CQRS (@nestjs/cqrs). NestJS 11 +
Fastify adapter, ESM-first, TypeScript strict, Vitest coverage ≥90%.

---

## 1. Cây file đã tạo/sửa

### App mới `api/` (`@vitasoft/api`, port 3001, prefix `/v1`)
```
api/
├── package.json                          (mới) NestJS 11 + Fastify + cqrs + swagger + terminus
├── tsconfig.json                         (mới) extend ../tsconfig.base.json, decorators on
├── vitest.config.ts                      (mới) unplugin-swc (decorator metadata), oxc:false, thresholds
├── .swcrc                                (mới) legacyDecorator + decoratorMetadata
├── .env.example                          (mới) PORT=3001, DATABASE_URL
├── README.md                             (mới) dependency rule + ASCII diagram Clean Architecture
├── Dockerfile                            (mới) multi-stage deps→build→runtime slim non-root ESM
└── src/
    ├── main.ts                           (mới) Fastify bootstrap, /v1, global filter+interceptor,
    │                                             Swagger non-prod, enableShutdownHooks, catch boot error
    ├── app.module.ts                     (mới) DatabaseModule + HealthModule + OrganizationsModule
    ├── infrastructure/database/
    │   ├── prisma.service.ts             (mới) injectable singleton wrapper, ping(), onModuleDestroy
    │   ├── prisma.service.spec.ts        (mới) ping up/down/degrade, disconnect
    │   └── database.module.ts            (mới) @Global provider PrismaService
    └── modules/
        ├── health/
        │   ├── health.controller.ts      (mới) /health/live + /health/ready (terminus, degrade)
        │   ├── health.controller.spec.ts (mới)
        │   └── health.module.ts          (mới)
        └── organizations/
            ├── domain/                    # PURE — không import framework/Prisma/HTTP
            │   ├── organization.entity.ts            (mới) entity readonly, fromPersistence()
            │   ├── organization.entity.test.ts       (mới)
            │   ├── organization.repository.ts        (mới) PORT interface + ORGANIZATION_REPOSITORY token
            │   └── organization.errors.ts            (mới) SlugTaken / NotFound domain errors
            ├── application/               # phụ thuộc CHỈ domain
            │   ├── commands/
            │   │   ├── create-organization.command.ts        (mới) Command<Organization>
            │   │   ├── create-organization.handler.ts        (mới) @CommandHandler, dùng PORT
            │   │   └── create-organization.handler.test.ts   (mới)
            │   └── queries/
            │       ├── get-organization.query.ts / .handler.ts        (mới)
            │       ├── list-organizations.query.ts / .handler.ts      (mới)
            │       └── organization-queries.test.ts                   (mới)
            ├── infrastructure/            # ADAPTER implement PORT
            │   ├── prisma-organization.repository.ts       (mới) @Injectable, map row→entity
            │   └── prisma-organization.repository.spec.ts  (mới)
            ├── presentation/              # controller + DTO (zod)
            │   ├── organization.dto.ts                     (mới) zod schema + toOrganizationResponse
            │   ├── organization.dto.test.ts                (mới)
            │   ├── organizations.controller.ts             (mới) POST/GET:id/GET, CommandBus/QueryBus,
            │   │                                                   map domain error → HTTP exception
            │   └── organizations.controller.spec.ts        (mới) integration qua CQRS thật + in-memory repo
            ├── testing/
            │   └── in-memory-organization.repository.ts    (mới) fake adapter cho test (giá trị Ports&Adapters)
            └── organizations.module.ts    (mới) wiring PORT→ADAPTER (useClass)
```

### `core/database` (`@vitasoft/database`)
```
core/database/
├── package.json                          (mới) @prisma/client 7.8.0 + @prisma/adapter-pg + pg
├── tsconfig.json                         (mới)
├── prisma.config.ts                      (mới) Prisma 7 config (datasource url ở đây, không ở schema)
├── prisma/
│   ├── schema.prisma                     (mới) generator prisma-client (ESM), model Organization + User(organizationId)
│   └── migrations/00000000000000_init/migration.sql   (mới) qua prisma migrate diff, đã test apply thật
├── vitest.config.ts                      (mới) thresholds 90/90/85
├── .env.example                          (mới) DATABASE_URL
├── README.md                             (mới)
└── src/
    ├── index.ts                          (mới) public surface + TSDoc
    ├── client.ts                         (mới) createPrismaClient + getPrismaClient singleton (pg adapter)
    ├── client.test.ts                    (mới)
    └── generated/client/**               (generated — prisma generate)
```

### `core/http-kit` (`@vitasoft/http-kit`)
```
core/http-kit/
├── package.json                          (mới) peer @nestjs/common+core, rxjs, zod; dep @vitasoft/logger
├── tsconfig.json / vitest.config.ts      (mới)
├── README.md                             (mới)
└── src/
    ├── index.ts                          (mới) public surface
    ├── problem-details.ts                (mới) ProblemDetails type + PROBLEM_JSON_CONTENT_TYPE
    ├── problem-exception.filter.ts       (mới) @Catch() RFC 7807, toProblemDetails() pure
    ├── problem-exception.filter.test.ts  (mới)
    ├── zod-validation.pipe.ts            (mới) ZodValidationPipe fail-fast, typed
    ├── zod-validation.pipe.test.ts       (mới)
    ├── logging.interceptor.ts            (mới) traceId + duration qua @vitasoft/logger
    └── logging.interceptor.test.ts       (mới)
```

### Root / sửa
- `pnpm-workspace.yaml` — thêm `"api"`.
- `docker-compose.yml` (mới, root) — api + postgres:17 + redis:7, healthchecks, env từ .env.
- `CLAUDE.md` — thêm dòng change log Phase 2a inc.1.
- `core/config/package.json`, `core/logger/package.json` — thêm `@types/node ^24`
  (BẮT BUỘC để chuỗi build turbo `^build` compile được — xem "Ghi chú" bên dưới).

---

## 2. Kết quả verification (nguyên văn)

Môi trường: Node v24.13.0 (Active LTS, đúng chính sách). pnpm KHÔNG có sẵn trên máy;
`corepack enable` bị EPERM (Program Files cần admin) → chạy pnpm qua corepack với
`COREPACK_HOME` user-local + shim `pnpm.cmd` để turbo tìm được binary. Đã ghi rõ để
CI/máy khác lưu ý.

### Version đã xác minh qua npm registry (không đoán)
NestJS core/common/platform-fastify/testing 11.1.27 · @nestjs/cqrs 11.0.3 ·
@nestjs/swagger 11.4.5 · @nestjs/terminus 11.1.1 · @fastify/static 9.1.3 ·
prisma / @prisma/client / @prisma/adapter-pg 7.8.0 · pg 8.22.0 · vitest 4.1.10 ·
zod 4.4.3 · reflect-metadata 0.2.2 · rxjs 7.8.2 · unplugin-swc 1.5.9 · @swc/core 1.15.43.

### `pnpm install`
Pass. Prisma client generate thành công (prisma-client generator → src/generated/client).

### `pnpm typecheck` (toàn workspace)
```
 Tasks:    12 successful, 12 total
  Time:    9.717s
```

### `pnpm build`
7 tasks pass gồm CẢ 5 package tôi tạo/động tới (config, logger, database, http-kit, api →
api/dist/main.js tồn tại). 1 task fail: `@vitasoft/homepage` — lỗi Windows EPERM symlink khi
Next.js `output: standalone` copy traced files (`EPERM: operation not permitted, symlink ...`).
Đây là lỗi môi trường Windows tiền tồn của homepage, KHÔNG liên quan increment này; build scoped
3 package mới pass sạch.

### `pnpm test` (+ coverage) — 3 package mới
```
core/database  Test Files 1 passed  · Tests 6 passed   · coverage 100/100/100 (lines/func/branch)
core/http-kit  Test Files 3 passed  · Tests 15 passed  · coverage 100 lines / 100 func / 96.42 branch
api            Test Files 8 passed  · Tests 30 passed  · coverage 100 lines / 100 func / 100 branch
```
Tổng **51 tests pass**. Tất cả trên/bằng ngưỡng 90 lines / 90 functions / 85 branches.

### Smoke test API chạy thật (Docker postgres:17)
Migration init apply thật vào Postgres → tạo bảng `organizations`, `users`. Chạy `node dist/main.js`:
- `GET /v1/health/live` → **200** `{"status":"ok"}`
- `GET /v1/health/ready` (không DB) → **503** RFC 7807 `database.status:"down"` (degrade gracefully, không crash)
- `GET /v1/health/ready` (có DB) → **200** `database.status:"up"`
- `POST /v1/organizations {slug:"acme",name:"Acme Inc"}` → **201** id cuid + createdAt ISO
- `POST` slug trùng → **409** problem+json "slug already taken"
- `POST {slug:"BAD",name:""}` → **400** problem+json liệt kê field errors (zod)
- `GET /v1/organizations` → **200** newest-first
- `GET /v1/organizations/:id` → **200** đúng record · id không tồn tại → **404** problem+json
- `GET /docs` (Swagger, non-prod) → **200**

Chứng minh trọn vẹn flow presentation → CommandBus/QueryBus → application handlers →
domain PORT → Prisma ADAPTER → Postgres. Container test đã teardown.

---

## 3. Quyết định kỹ thuật đáng chú ý

1. **Prisma 7 (bản mới nhất) đổi kiến trúc config** — breaking so với Prisma 6:
   `url` KHÔNG còn ở `datasource` block; connection string chuyển sang `prisma.config.ts`,
   và runtime PrismaClient BẮT BUỘC nhận **driver adapter** (`@prisma/adapter-pg` + `pg`).
   Generator đổi sang `prisma-client` (emit TS/ESM, tự compile qua tsc). Đã áp dụng đúng
   mô hình Prisma 7 thay vì hạ version — nhất quán "framework hiện đại, upgrade path rõ".

2. **Ports & Adapters có kiểm chứng, không hình thức** — handlers nhận repository qua
   `@Inject(ORGANIZATION_REPOSITORY)`; unit test dùng `InMemoryOrganizationRepository`
   (không DB), integration test dùng CQRS bus thật + in-memory repo. Đây chính là giá trị
   của DI seam: đổi adapter không đụng application/domain.

3. **RFC 7807 filter — reserved fields không bị clobber** — phát hiện khi smoke test:
   `@nestjs/terminus` nhét `status:"error"` (string) vào body 503, ban đầu ghi đè `status`
   số của problem doc → Fastify lỗi "invalid status code". Sửa: spread extensions TRƯỚC,
   set reserved fields (type/title/status/instance) SAU, và loại `status`/`statusCode` khỏi
   extensions. Có test riêng cho case này.

4. **Vitest + NestJS DI cần decorator metadata** — esbuild/oxc không emit
   `emitDecoratorMetadata`; dùng `unplugin-swc` + `.swcrc` (legacyDecorator+decoratorMetadata)
   và `oxc:false` để SWC độc quyền transform. Không thế thì type-based injection (CommandBus)
   fail trong test.

5. **Health degrade gracefully** — `/health/live` không chạm DB (tránh restart loop khi DB
   sập); `/health/ready` dùng `HealthIndicatorService.check().up()/.down()` của terminus 11 →
   trả 503 sạch khi DB chưa lên, API vẫn live.

6. **Port 3001** — config default PORT là 3000; main.ts override thành 3001 khi env PORT
   không set, honor task requirement mà không sửa @vitasoft/config.

---

## 4. Việc còn lại cho increment sau

- **better-auth + RBAC** (`@vitasoft/auth`): session cookie, org/tenant guards, decorators
  `@Roles()`, service-to-service API key/JWT. Model `User` đã có `organizationId` sẵn làm tenant key.
- **Tenant-scoping**: Prisma middleware/client-extension tự inject filter `organizationId`
  (+ cân nhắc RLS) — đặt trong `@vitasoft/database`.
- **Observability** (`@vitasoft/observability`): OpenTelemetry SDK, Prometheus `/metrics`,
  4 golden signals, OTLP → Grafana Cloud.
- **http-kit mở rộng**: `@nestjs/throttler` (Redis) rate limit, idempotency key (Redis),
  secure headers (CSP/HSTS), API versioning helpers.
- **BullMQ** (`@vitasoft/jobs`): queue + worker, graceful drain, dead-letter (khi có tác vụ AI nền).
- **Playwright E2E** cho API critical flows (quality-standards §4) — chưa nằm trong scope inc.1.
- **CI wiring**: thêm api/database/http-kit vào pipeline typecheck/build/test/audit; cân nhắc
  `prisma migrate deploy` từ CD (expand-contract).

## 5. Ghi chú ngoài scope (để leader quyết)

- **`@vitasoft/homepage` build fail trên Windows** (EPERM symlink, Next.js `output: standalone`).
  Tiền tồn, không do increment này. Gợi ý: chạy build homepage trong container Linux, hoặc bật
  Windows Developer Mode / chạy admin để cho phép symlink, hoặc tắt `output: standalone` nếu
  không deploy standalone. Cần leader/qa xác nhận hướng.
- **`@types/node` thiếu ở core/config & core/logger** — đã thêm `^24` vì chuỗi build turbo
  `^build` của package mới yêu cầu chúng compile (trước đây chưa bao giờ build trong chuỗi này
  nên lỗi ẩn). Thay đổi tối thiểu, đúng scope để increment build được.
- **pnpm không cài sẵn trên máy dev** — cần `corepack enable` (admin) hoặc cài pnpm để lệnh
  `pnpm ...` chạy trực tiếp; hiện phải đi qua corepack shim.

---

**Đề nghị:** báo `qa-reviewer` verify increment này (incremental QA) — trọng tâm điểm tiếp giáp
api ↔ core/database ↔ core/http-kit ↔ core/logger, và chất lượng assertion của 51 tests.
