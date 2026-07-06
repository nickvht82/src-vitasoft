# Bộ tính năng backend `core/` Vitasoft — nền tảng dùng chung cho mọi sản phẩm

**Ngày:** 2026-07-06 | **Người yêu cầu:** huyvht8582@gmail.com (leader) | **Trạng thái:** khuyến nghị (cần leader chốt)
**Người thực hiện:** research-analyst (Vitasoft)
**Tiền đề đã chốt:** NestJS 11 + adapter Fastify, TypeScript strict, Node 22 LTS, ESM-first, Vitest, PostgreSQL + Prisma + Redis, GKE + Docker. (xem `2026-07-06-backend-framework-core.md`)

---

## TL;DR

Khuyến nghị theo 5 nhóm, ưu tiên **managed/đơn giản vận hành** cho team rất nhỏ, dependency không EOL, chi phí thấp ở phase đầu:

1. **Phân quyền & bảo mật** — **better-auth 1.6.x** (TypeScript-native, self-host, org/multi-tenant + JWT/JWKS built-in) cho authN người dùng; **JWT client credentials / API key hashed** cho service-to-service; **RBAC (roles + permissions) ngay từ đầu**, để đường nâng lên **ReBAC (OpenFGA) chỉ khi có nhu cầu chia sẻ tài nguyên phức tạp** — hầu hết SaaS 2026 dùng RBAC coarse + ReBAC resource-level. Về **E2E encryption: nói thẳng — E2E thực thụ (client giữ khóa, server không giải mã được) KHÔNG hợp lý cho backend API đa sản phẩm này**; cái đúng cần làm là **TLS in-transit (Cloud-managed) + field-level encryption chọn lọc cho dữ liệu nhạy cảm qua GCP KMS envelope**. **mTLS service-to-service: chưa cần** ở phase đầu (1 cluster, network policy đủ); cân nhắc khi tách nhiều service + compliance.

2. **Multi-product flexibility** — **Modular monolith** (một deployable NestJS, nhiều module có ranh giới rõ) — KHÔNG microservices cho team nhỏ. **Multi-tenancy: shared DB + cột `tenant_id` + Prisma middleware/RLS**, không tách DB/schema per-tenant ở đầu. **Feature flags: OpenFeature SDK (chuẩn vendor-neutral) + provider GrowthBook self-host** (miễn phí, không per-seat; tránh Unleash OSS Edge sunset 31/12/2026). Module chung: auth, config, observability, notification (billing để sau).

3. **Monitor & scale** — **OpenTelemetry SDK (traces + metrics) trong app + Prometheus `/metrics`**, xuất về **Grafana Cloud free tier** (managed, không tự vận hành Prometheus/Grafana). **`@nestjs/terminus` cho `/health/live` + `/health/ready`**. **GKE HPA autoscaling/v2 theo CPU + RPS** (custom metric qua adapter khi cần). Đo từ ngày 1: 4 golden signals (latency, traffic, errors, saturation) + health.

4. **Alerting** — **Grafana Cloud Alerting** (đi kèm, không thêm hạ tầng). Chỉ ~5–7 rule khởi đầu quanh golden signals, mọi rule có `for:` (5–15m) để tránh nhiễu, alert phải **actionable**. Kênh: **Telegram (chính, free) + email**; Slack nếu team đã dùng. Review rule định kỳ, xóa rule không dẫn tới hành động.

5. **Vận hành chuyên nghiệp** — bắt buộc từ đầu: **graceful shutdown** (`enableShutdownHooks`, SIGTERM drain), **`prisma migrate deploy` từ pipeline khóa + expand-contract** cho zero-downtime, **rate limiting `@nestjs/throttler` (Redis storage)**, **background jobs BullMQ 5.79.x**, **audit log** (bảng append-only), **API versioning URI (`/v1`)**, **idempotency key (Redis, cho POST tiền/tác vụ)**, **backup/restore Cloud SQL PITR managed**.

### Danh sách module `core/` đề xuất (input cho builder scaffold)

| Module | Phạm vi | Phase |
|---|---|---|
| `@vitasoft/auth` | better-auth wrapper: session/JWT, org/tenant, RBAC guards & decorators, service-to-service API-key/JWT | Ngay từ đầu |
| `@vitasoft/config` | Load + validate env bằng Zod, typed config, secret từ Secret Manager | Ngay từ đầu |
| `@vitasoft/database` | PrismaService, tenant-scoping middleware, health check DB, migration helpers | Ngay từ đầu |
| `@vitasoft/observability` | OTel setup (traces/metrics), Prometheus `/metrics`, terminus health, request-id/logging (pino) | Ngay từ đầu |
| `@vitasoft/http-kit` | Throttler (rate limit), idempotency interceptor, API versioning, exception filter, Zod validation pipe, secure headers | Ngay từ đầu |
| `@vitasoft/jobs` | BullMQ queue module, worker base, graceful drain, dead-letter | Khi có tác vụ nền thật |
| `@vitasoft/audit` | Audit-log service (append-only), decorator ghi hành động nhạy cảm | Khi có user thật |
| `@vitasoft/feature-flags` | OpenFeature client + GrowthBook provider, typed flag accessor | Khi có user thật |
| `@vitasoft/notification` | Email (transactional) + Telegram/Slack adapter, template | Khi có user thật |
| `@vitasoft/crypto` | Field-level encryption qua GCP KMS envelope (helper cho cột nhạy cảm) | Khi lưu dữ liệu nhạy cảm |
| `@vitasoft/authz-fga` (tùy chọn) | OpenFGA client cho ReBAC resource-level | Khi RBAC không đủ |
| `@vitasoft/billing` (placeholder) | Tích hợp cổng thanh toán, subscription | Khi thương mại hóa |

**Báo cáo đầy đủ:** file này. **Nguồn** kèm ngày truy cập 2026-07-06 ở từng mục.

---

## 1. Câu hỏi & ràng buộc

**Quyết định:** Xác định feature set nền tảng cho `core/` — thứ mọi sản phẩm (Mind, marketing, ideas mới) build lên trên — và chọn giải pháp cụ thể (thư viện/managed) cho 5 nhóm: (1) phân quyền & bảo mật + E2E encryption, (2) multi-product flexibility, (3) monitor & scale, (4) alerting, (5) vận hành chuyên nghiệp.

**Ràng buộc:** NestJS 11 + Fastify, TS strict, Node 22, PostgreSQL + Prisma + Redis, GKE + Docker; **team rất nhỏ** → ưu tiên managed/đơn giản; dependency không EOL (<12 tháng = loại); chi phí thấp phase đầu.

---

## 2. Nhóm 1 — Phân quyền & bảo mật truy cập

### 2.1 Authentication người dùng

**Ứng viên (đã xác minh 2026-07-06):**

| Giải pháp | Mô hình | Dữ kiện xác minh | EOL/health |
|---|---|---|---|
| **better-auth** | Self-host, TS-native library | v**1.6.23**; repo 28.955 sao, `pushed_at` 2026-07-05, 598 issue mở, không archived ([npm](https://registry.npmjs.org/better-auth/latest); [GitHub API](https://api.github.com/repos/better-auth/better-auth), 2026-07-06) | Active mạnh, không EOL |
| **Clerk** | Managed SaaS | UI dựng sẵn, org/invite, nhanh ra prod nhưng **không self-host**, giá theo MAU tăng ([supastarter](https://supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk), 2026-07-06) | Managed |
| **Keycloak** | Self-host, Java/JVM | Enterprise IAM (OIDC/SAML/LDAP), free nhưng **cần vận hành JVM**, lệch stack TS ([skycloak](https://skycloak.io/blog/keycloak-vs-clerk-comparison/), 2026-07-06) | Active |

**Khuyến nghị: better-auth.** Lý do: TypeScript-native (hợp NestJS/Fastify, không cần vận hành JVM như Keycloak, không lock-in/giá-theo-user như Clerk). Có sẵn **organization plugin (multi-tenancy: teams, roles, invitations, access control) từ v1.3+** và **JWT plugin (token + JWKS endpoint)** dùng cho service cần JWT ([Better Auth Organization](https://better-auth.com/docs/plugins/organization); [JWT](https://better-auth.com/docs/plugins/jwt), 2026-07-06). Đáp ứng đúng "không tự chế crypto/session — dùng thư viện chuẩn" (quality-standards §2). Rủi ro: better-auth trẻ hơn Keycloak, 598 issue mở → theo dõi qua Dependabot, pin version, đọc changelog trước khi nâng.

**Phase:** ngay từ đầu (module `@vitasoft/auth`).

### 2.2 Service-to-service (machine-to-machine)

Không cần thêm hạ tầng. Hai lựa chọn, dùng cùng lúc:
- **API key hashed** (lưu hash trong DB, gửi header) cho internal service đơn giản.
- **JWT client-credentials** (dùng JWKS của better-auth để verify) khi cần scope/expiry chuẩn OAuth.

**Phase:** ngay từ đầu (nằm trong `@vitasoft/auth`), nhưng chỉ bật khi thực sự có service thứ hai gọi vào.

### 2.3 Authorization model (RBAC / ABAC / ReBAC)

**Dữ kiện:** RBAC hợp mô hình phẳng, vỡ khi có hierarchy/sharing/multi-tenancy sâu; ReBAC (Zanzibar-style) là superset, phủ ABAC khi biểu diễn thuộc tính thành quan hệ. **Hầu hết B2B SaaS 2026 dùng hybrid: RBAC coarse-grained + ReBAC resource-level** ([OpenFGA authz concepts](https://openfga.dev/docs/authorization-concepts); [PkgPulse OpenFGA vs Permify vs SpiceDB 2026](https://www.pkgpulse.com/guides/openfga-vs-permify-vs-spicedb-zanzibar-authorization-2026), 2026-07-06).

Engine ReBAC nếu cần: **OpenFGA** (Auth0/Okta, đơn giản, nhiều SDK) — repo 5.380 sao, `pushed_at` 2026-06-30, không archived ([GitHub API](https://api.github.com/repos/openfga/openfga), 2026-07-06); **SpiceDB** trung thành Zanzibar hơn, biểu đạt mạnh hơn (intersection/exclusion) nhưng phức tạp hơn.

**Khuyến nghị:**
- **RBAC ngay từ đầu** — roles + permissions trong `@vitasoft/auth` (better-auth access control), guard/decorator NestJS. Đủ cho phần lớn use case ban đầu (owner/admin/member trong tenant).
- **ReBAC (OpenFGA) chỉ khi có nhu cầu thật**: chia sẻ tài nguyên cấp document/folder, phân quyền theo quan hệ (VD Mind chia sẻ workspace). Tách thành module tùy chọn `@vitasoft/authz-fga` để không gánh phức tạp sớm.
- **ABAC thuần: không khuyến nghị làm riêng** — biểu diễn attribute dưới dạng điều kiện trong RBAC/ReBAC là đủ, tránh policy-engine riêng.

**Phase:** RBAC ngay từ đầu; ReBAC khi scale/khi tính năng chia sẻ xuất hiện.

### 2.4 Session / token strategy

- **Người dùng web:** session cookie httpOnly/secure/SameSite (better-auth quản), an toàn hơn lưu JWT ở localStorage.
- **API/mobile/service:** JWT ngắn hạn + refresh, verify qua JWKS.
- **Revocation & rate của refresh:** dùng Redis (đã có trong stack) làm session/deny-list store.

### 2.5 E2E encryption — phân tích trung thực

**Kết luận thẳng: "End-to-end encryption" đúng nghĩa (chỉ hai đầu client có khóa, server trung gian KHÔNG giải mã được) KHÔNG áp dụng được cho backend API đa sản phẩm này** — vì server *phải* đọc/xử lý/truy vấn dữ liệu (auth, search, business logic, AI trên nội dung). E2E chỉ đúng cho mô hình mà server chỉ là "ống dẫn mù" (messenger kiểu Signal, password manager kiểu zero-knowledge). Gọi kiến trúc này là "E2E encryption" sẽ là **khẩu hiệu sai sự thật**. Cái thực sự cần và khả thi:

| Lớp | Có phải "E2E"? | Khuyến nghị | Phase |
|---|---|---|---|
| **Client ↔ server (in-transit)** | Không (là TLS point-to-point) | **TLS 1.2/1.3 do GKE Ingress/Load Balancer + Google-managed cert** — bắt buộc. HSTS. | Ngay từ đầu |
| **Service ↔ service (mTLS)** | Không (mutual TLS, không E2E) | **Chưa cần phase đầu**: trong 1 cluster + NetworkPolicy là đủ. mTLS (Linkerd — nhẹ hơn Istio cho team nhỏ) chỉ khi tách nhiều service + yêu cầu compliance ([Istio vs Linkerd 2026](https://lucaberton.com/blog/istio-vs-linkerd-2026/); [Linkerd automatic mTLS](https://linkerd.io/2-edge/features/automatic-mtls/), 2026-07-06). | Khi scale/compliance |
| **At-rest toàn DB** | Không | Cloud SQL mã hóa đĩa mặc định (Google-managed) — miễn phí, tự động. | Ngay từ đầu |
| **Field-level cho dữ liệu nhạy cảm** | Gần zero-knowledge nếu client giữ khóa; ở đây là app-managed | **Envelope encryption qua GCP KMS** cho các cột nhạy cảm cụ thể (VD token bên thứ ba, PII đặc biệt). App mã hóa trước khi ghi, giải mã khi đọc; KMS giữ KEK. KHÔNG mã hóa cột cần query/index. | Khi lưu dữ liệu nhạy cảm |

Cơ sở kỹ thuật field-level: PostgreSQL `pgcrypto` mã hóa server-side nhưng khóa đi qua server; **client-side/app-side envelope với KMS (Tink) là mức bảo vệ cột thực chất nhất** trên Cloud SQL ([PostgreSQL 18 Encryption Options](https://www.postgresql.org/docs/current/encryption-options.html); [GCP client-side encryption Cloud SQL](https://docs.cloud.google.com/sql/docs/postgres/client-side-encryption), 2026-07-06).

**Tóm lại:** làm **TLS everywhere + at-rest managed ngay**, **field-level KMS chọn lọc** khi có dữ liệu nhạy cảm thật; **không hứa "E2E encryption"** ở tầng API vì nó không đúng bản chất và sẽ tạo kỳ vọng sai.

---

## 3. Nhóm 2 — Multi-product flexibility

### 3.1 Kiến trúc: Modular monolith vs Microservices

**Khuyến nghị: Modular monolith.** Một deployable NestJS, mỗi sản phẩm/domain là một Nest module với ranh giới rõ (module boundary, không import chéo lung tung). Lý do cho team rất nhỏ: microservices thêm chi phí vận hành (network, tracing phân tán, deploy nhiều service, consistency) mà lợi ích scale độc lập chưa cần. NestJS DI + module cho sẵn ranh giới để **sau này tách service khi module nào thực sự cần scale riêng** — chi phí tách thấp vì boundary đã rõ. (Nhất quán với kết luận framework: NestJS mạnh ở "cấu trúc cho hệ nhiều service".)

**Phase:** ngay từ đầu. Tách microservice: chỉ khi một module có yêu cầu scale/độc lập rõ ràng.

### 3.2 Multi-tenancy model

| Model | Ưu | Nhược | Phù hợp |
|---|---|---|---|
| **Shared DB, shared schema, `tenant_id`** | Rẻ nhất, đơn giản vận hành, 1 migration | Phải cẩn thận isolation (mọi query lọc tenant) | **Phase đầu** |
| Shared DB, schema-per-tenant | Isolation tốt hơn | Migration nhân theo tenant, phức tạp | Khi tenant lớn ít |
| DB-per-tenant | Isolation cao nhất | Vận hành đắt, không hợp team nhỏ | Enterprise/compliance |

**Khuyến nghị: Shared DB + `tenant_id` + tự động lọc bằng Prisma middleware (client extension)**; cân nhắc **PostgreSQL Row-Level Security (RLS)** làm lớp phòng thủ thứ hai chống lỗi bỏ sót filter. Đặt trong `@vitasoft/database`.

**Phase:** ngay từ đầu.

### 3.3 Feature flags

**Dữ kiện quan trọng:** **Unleash OSS Edge sunsetting 31/12/2026** — sau đó self-host ở quy mô cần Enterprise Edge (thêm phụ thuộc trả phí) ([FlagShark 2026](https://flagshark.com/blog/open-source-feature-flag-tools-compared-2026/); [GrowthBook — Unleash alternatives](https://www.growthbook.io/blog/unleash-alternatives), 2026-07-06). → **rủi ro EOL một phần trong <12 tháng, loại Unleash làm mặc định.** GrowthBook self-host: không per-seat fee, cloud free tier tới 3 user ([GrowthBook best open-source 2026](https://www.growthbook.io/blog/best-open-source-feature-flagging-tools-compared), 2026-07-06).

**Khuyến nghị:** dùng **OpenFeature SDK** (chuẩn vendor-neutral, có provider chính thức cho JS) làm interface trong code, backend là **GrowthBook (self-host hoặc cloud free tier)**. Lợi: code không lock vào một vendor — đổi provider sau này không sửa call site; GrowthBook thêm được A/B test/experiment khi cần. Cả hai đều hỗ trợ OpenFeature ([DevCycle — top OpenFeature providers](https://blog.devcycle.com/comparing-top-openfeature-providers/), 2026-07-06).

**Phase:** khi có user thật (cần bật/tắt tính năng theo tenant/rollout). Module `@vitasoft/feature-flags`.

### 3.4 Module NestJS dùng chung

Xem bảng module ở TL;DR. Nguyên tắc: **auth, config, observability, http-kit** là hạ tầng bắt buộc mọi sản phẩm import; **billing/notification** là module thêm khi cần. Đóng gói dạng package trong monorepo (`packages/*` hoặc `libs/*`) để mọi app trong `core/` cùng dùng một version.

---

## 4. Nhóm 3 — Monitor & scale theo thời gian thực

### 4.1 Metrics / tracing

**Khuyến nghị:** **OpenTelemetry** trong app (auto-instrumentation HTTP/Prisma/Redis + custom span), xuất OTLP về **Grafana Cloud** (managed, không tự vận hành Prometheus/Tempo/Grafana — hợp team nhỏ). **Application Observability trên Grafana Cloud GA cho cả free-forever tier**, native OTel + Prometheus ([Grafana Cloud Application Observability](https://grafana.com/blog/announcing-application-observability-in-grafana-cloud-with-native-support-for-opentelemetry-and-prometheus/), 2026-07-06).

Thư viện: **`nestjs-otel`** (traces + metrics module cho Nest) — 787 sao, `pushed_at` 2026-07-01, 8 issue mở, không archived ([GitHub API pragmaticivan/nestjs-otel](https://api.github.com/repos/pragmaticivan/nestjs-otel), 2026-07-06). Nhỏ nhưng active; nếu lo phụ thuộc, có thể dùng OpenTelemetry SDK trực tiếp — chuẩn OTel là hạ tầng lâu dài, không lock-in.

### 4.2 Health checks

**`@nestjs/terminus`** (module chính thức Nest): expose `/health/live` (liveness) và `/health/ready` (readiness — check DB/Redis). Map vào GKE liveness/readiness probe. Bắt buộc để rolling update và HPA hoạt động đúng.

### 4.3 HPA trên GKE

Dùng **`autoscaling/v2`** (đa metric) — scale theo CPU/memory + **custom metric (RPS)** qua Custom Metrics Adapter (Cloud Monitoring); HPA control loop ~15s ([GKE HPA docs](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/horizontal-pod-autoscaling); [Beyond CPU — custom metrics HPA GKE](https://cloud.google.com/blog/products/gcp/beyond-cpu-horizontal-pod-autoscaling-comes-to-google-kubernetes-engine), 2026-07-06). **Bắt đầu bằng CPU + memory** (đơn giản), thêm RPS/queue-depth khi có traffic thật.

### 4.4 Đo gì từ ngày 1

- **4 golden signals:** Latency (p50/p95/p99), Traffic (RPS), Errors (rate 4xx/5xx), Saturation (CPU/mem/pool DB/queue depth).
- Health endpoint live/ready.
- Request-id + structured logging (**pino** — nhanh, ESM, hợp Fastify) gắn trace-id để correlate log↔trace.

**Phase:** OTel + Prometheus `/metrics` + terminus + logging **ngay từ đầu** (`@vitasoft/observability`). HPA custom metric khi có traffic.

---

## 5. Nhóm 4 — Hệ thống cảnh báo (alerting)

**Khuyến nghị:** **Grafana Cloud Alerting** — dùng luôn nền tảng observability đã chọn, không thêm hạ tầng (khác với tự dựng Alertmanager). Với team nhỏ, ít-mà-tinh quan trọng hơn nhiều rule.

**Rule khởi đầu (~5–7, quanh golden signals):**

| Rule | Ngưỡng gợi ý | `for:` |
|---|---|---|
| Error rate cao | 5xx > 2% request trong cửa sổ | 5m |
| Latency p95 xấu | p95 > ngưỡng SLO (VD 1s) | 10m |
| Saturation | CPU/mem > 85% kéo dài, hoặc DB pool cạn | 10m |
| Health fail | readiness fail / pod crashloop | 5m |
| Queue backlog | BullMQ waiting > N kéo dài | 15m |
| Cert/expiry, disk (khi có) | sắp hết | — |

**Chống alert fatigue (dữ kiện):** tránh ngưỡng tĩnh vô nghĩa (VD CPU>90% tức thời), **dùng `for:` để bỏ blip**, group alert liên quan, **chỉ giữ alert dẫn tới hành động**, review định kỳ xóa rule nhiễu ([Grafana Alerting best practices](https://grafana.com/docs/grafana/latest/alerting/guides/best-practices/); [incident.io — SRE alerting](https://incident.io/blog/sre-alerting-best-practices), 2026-07-06).

**Kênh nhận:** **Telegram** (miễn phí, bot dễ dựng, hợp team nhỏ VN) làm kênh chính + **email** cho lưu vết; Slack contact point nếu team đã dùng Slack ([Grafana Notifications](https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/), 2026-07-06).

**Phase:** khi deploy production/có user thật (khi có gì để cảnh báo). Bộ rule tối thiểu ngay khi lên prod.

---

## 6. Nhóm 5 — Tính năng vận hành chuyên nghiệp

| Tính năng | Giải pháp cụ thể | Phase | Nguồn |
|---|---|---|---|
| **Graceful shutdown** | `app.enableShutdownHooks()`, xử lý SIGTERM: ngừng nhận request mới, drain in-flight + BullMQ worker; `terminationGracePeriodSeconds` GKE đủ dài | Ngay từ đầu | [GKE graceful termination](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/horizontal-pod-autoscaling) (2026-07-06) |
| **Migration DB an toàn** | `prisma migrate deploy` **chỉ từ pipeline khóa** (migrate dev không bao giờ chạm prod); **expand-contract** cho rename/drop (3 deploy: add → dual-write → drop); backup trước migration destructive; rollback qua feature flag/reverse migration (Prisma không auto-rollback) | Ngay từ đầu | [Prisma data-migration expand/contract](https://www.prisma.io/docs/guides/data-migration); [Juliano Alves — Prisma prod](https://julianoalves.me/blog/prisma-migrations-production) (2026-07-06) |
| **Background jobs / queue** | **BullMQ 5.79.2** qua **`@nestjs/bullmq`** (Redis đã có); worker riêng, retry/backoff, dead-letter, drain khi shutdown | Khi có tác vụ nền | [npm bullmq](https://registry.npmjs.org/bullmq/latest) v5.79.2; [NestJS Queues](https://docs.nestjs.com/techniques/queues) (2026-07-06) |
| **Rate limiting** | **`@nestjs/throttler`** (hỗ trợ Fastify; đọc IP qua `req.ips` sau proxy) + **Redis storage** để đồng bộ đa-pod; trả header X-RateLimit-* | Ngay từ đầu | [nestjs/throttler](https://github.com/nestjs/throttler) (2026-07-06) |
| **Audit log** | Bảng append-only (actor, action, resource, tenant, timestamp, ip); decorator ghi hành động nhạy cảm (đổi quyền, xóa, thanh toán); không cho update/delete | Khi có user thật | — |
| **API versioning** | NestJS URI versioning `/v1/...` (rõ ràng, cache-friendly hơn header versioning); dùng `enableVersioning` | Ngay từ đầu | [NestJS versioning] |
| **Idempotency** | **`@node-idempotency/nestjs`** hoặc interceptor tự viết: client gửi `Idempotency-Key` (UUIDv4), lưu kết quả trong **Redis TTL ~24h**, scope theo user; áp cho POST tiền/tác vụ không lặp | Khi có ghi trọng yếu | [node-idempotency](https://github.com/mahendraHegde/node-idempotency); [Zuplo idempotency keys](https://zuplo.com/learning-center/implementing-idempotency-keys-in-rest-apis-a-complete-guide) (2026-07-06) |
| **Backup / restore** | **Cloud SQL automated backups + Point-in-Time Recovery (managed)** — không tự script pg_dump ở phase đầu; test restore định kỳ | Ngay từ đầu | GCP Cloud SQL managed |
| **Secure headers / input validation** | Helmet-equivalent (CSP/HSTS), **Zod validation pipe tại boundary** — mọi input untrusted (quality-standards §2) | Ngay từ đầu | quality-standards §2 |

Gom vào module: `@vitasoft/http-kit` (throttler, idempotency, versioning, validation, secure headers, exception filter), `@vitasoft/jobs` (BullMQ), `@vitasoft/audit`, `@vitasoft/database` (migration helper). Graceful shutdown + backup là cấu hình app/infra.

---

## 7. Ma trận quyết định tóm tắt (các lựa chọn then chốt)

| Nhóm | Chọn | Đối thủ (lý do loại — 1 dòng) |
|---|---|---|
| AuthN | **better-auth** | Clerk (managed, giá theo MAU, không self-host) · Keycloak (JVM, lệch stack TS, vận hành nặng) |
| AuthZ | **RBAC → ReBAC(OpenFGA) khi cần** | SpiceDB (mạnh hơn nhưng phức tạp, chưa cần) · ABAC riêng (thừa) |
| E2E encryption | **TLS + field-level KMS** | "E2E thực thụ" (không khả thi cho API cần đọc dữ liệu) · mTLS (chưa cần phase đầu) |
| Kiến trúc | **Modular monolith** | Microservices (chi phí vận hành cao cho team nhỏ) |
| Multi-tenancy | **Shared DB + tenant_id (+RLS)** | Schema/DB-per-tenant (đắt vận hành) |
| Feature flags | **OpenFeature + GrowthBook** | Unleash (OSS Edge sunset 31/12/2026 = rủi ro EOL một phần) |
| Observability | **OTel → Grafana Cloud (managed)** | Tự dựng Prometheus+Grafana (vận hành cho team nhỏ) |
| Alerting | **Grafana Cloud Alerting + Telegram/email** | Alertmanager tự dựng (thêm hạ tầng) |
| Queue | **BullMQ + @nestjs/bullmq** | (dùng Redis sẵn có, không cần thêm broker) |
| Backup | **Cloud SQL PITR managed** | pg_dump tự script (dễ sai, thiếu PITR) |

---

## 8. Ghi chú độ tin cậy & điểm chưa xác minh

- **Phiên bản/health** lấy từ **npm registry API** và **GitHub API** (chính thức) — better-auth 1.6.23 / 28.955 sao; bullmq 5.79.2; nestjs-otel 787 sao; openfga 5.380 sao — tất cả `pushed_at` trong tuần 2026-06-30…07-05, không archived.
- **endoflife.date không có entry `prisma`** (Prisma tự quản version, không công bố EOL formal) → dựa vào nhịp release để đánh giá, không có "hạn EOL" cứng. Node 22 EOL 04/2027, Redis còn hỗ trợ — xác nhận ở báo cáo framework trước.
- **Unleash OSS Edge sunset 31/12/2026:** nguồn là blog GrowthBook/FlagShark (đối thủ của Unleash) — **cần leader xác nhận lại từ trang chính Unleash trước khi loại hẳn**; nhưng vì có OpenFeature làm lớp trừu tượng, chọn GrowthBook là quyết định ít rủi ro (đổi provider sau không sửa code).
- **Con số GitHub stars** từ web search khác nhẹ so với GitHub API (VD better-auth ~29k UI vs 28.955 API) — **dùng số từ API**.
- Nhiều nguồn hệ sinh thái/alerting là blog kỹ thuật (Grafana docs là chính thức) — dùng làm best practice/bối cảnh, không dùng làm dữ kiện vòng đời.

---

*Báo cáo tạo bởi research-analyst theo skill `deep-research` + `quality-standards`. Đầu ra danh sách module là input trực tiếp cho builder scaffold `core/`. Mọi dữ kiện quan trọng kèm nguồn + ngày truy cập 2026-07-06.*
