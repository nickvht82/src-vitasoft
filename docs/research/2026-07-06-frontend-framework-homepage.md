# Framework frontend web tốt nhất 2026 cho `vitasoft-homepage` (và pattern nhân rộng cho Mind + các sản phẩm)

**Ngày:** 2026-07-06 | **Người yêu cầu:** huyvht8582@gmail.com (leader) | **Trạng thái:** khuyến nghị (cần leader chốt)
**Người thực hiện:** research-analyst (Vitasoft)
**Tiền đề đã chốt:** Backend NestJS 11 + Fastify, better-auth 1.6.x, TypeScript strict, Node 22 LTS, pnpm + Turborepo, GKE + Docker. (xem `2026-07-06-backend-framework-core.md`, `2026-07-06-core-backend-features.md`)

---

## TL;DR

Khuyến nghị **giữ Next.js nhưng nâng lên Next.js 16 (App Router, RSC)** làm framework frontend chuẩn cho `vitasoft-homepage` và nhân rộng cho Mind + các sản phẩm. Ba lý do chốt: (1) Next.js là framework React duy nhất trong nhóm ứng viên **hội đủ đồng thời cả 7 tiêu chí founder** ở mức mạnh — đặc biệt SEO (SSR/SSG/ISR + Metadata API + hàm `sitemap`/`robots` native) và i18n (next-intl là chuẩn de-facto cho App Router); (2) skeleton hiện tại đã là Next.js, **chi phí giữ = 0**, còn chi phí chuyển sang Astro/SvelteKit/Nuxt gồm cả rời hệ React (Nuxt) hoặc mất app-shell động cho trang chủ + auth; (3) ràng buộc vòng đời **buộc phải hành động ngay bất kể chọn gì**: repo đang ghim **Next.js 15.1.4** mà Next 15 **EOL 21/10/2026** — dưới 12 tháng tính từ hôm nay, vi phạm gate EOL của `quality-standards` → **nâng lên Next 16 là bắt buộc** (Next 16 EOL ~10/2027, còn >12 tháng).

Về hai câu hỏi "bẫy" founder yêu cầu trả lời trung thực:
- **Mode desktop/mobile:** cách đúng đắn 2026 là **responsive design** (một layout, fluid grid + media/container query), **KHÔNG** adaptive serving/device-detection (dựng 2 layout theo User-Agent). Adaptive chỉ hợp ngoại lệ hiệu năng cực đoan (dashboard trading, set-top box) — không phải trang chủ giới thiệu sản phẩm.
- **Next.js self-host ngoài Vercel:** **không bị khóa vào Vercel**, self-host trên GKE/Docker hoàn toàn khả thi và được document chính thức — nhưng **có phí tổn cấu hình thật** cho multi-pod (ISR cần custom cache handler + Redis; cần set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `deploymentId`; image optimization cần `sharp` build đúng cho Linux glibc, hoặc offload sang CDN/loader). Đây là việc-làm-một-lần, không phải rào cản.

**Stack đi kèm khuyến nghị (theo 7 tiêu chí):** Next.js 16 (App Router) + **next-intl** (i18n) + **Tailwind CSS v4 + shadcn/ui** (UI, responsive) + **openapi-typescript + openapi-fetch** (API client type-safe từ Swagger của NestJS) + **better-auth cookie relay** (auth) + **next/image với sharp + CDN offload** (ảnh khi self-host) + **Vitest + Playwright** (test, đã là chuẩn repo).

---

## 1. Câu hỏi & ràng buộc

**Quyết định:** Chọn 1 framework frontend web làm chuẩn cho `vitasoft-homepage` (trang chủ liên kết các sản phẩm Vitasoft), pattern sau đó nhân rộng cho frontend Mind và các sản phẩm khác. Repo có sẵn skeleton Next.js 15 — đánh giá khách quan giữ hay chuyển, **tính chi phí chuyển đổi vào ma trận**.

**7 tiêu chí bắt buộc (founder):** (1) Đa ngôn ngữ i18n + SEO hreflang; (2) hỗ trợ nhiều độ phân giải mobile→4K; (3) 2 mode desktop/mobile — responsive vs adaptive; (4) giao tiếp tốt với NestJS (API client type-safe + auth better-auth); (5) SEO mạnh (SSR/SSG/ISR, metadata, sitemap, structured data, CWV); (6) best practices frontend (a11y WCAG, component architecture, Vitest + Playwright); (7) performance (bundle, hydration, Lighthouse/CWV).

**Ràng buộc:** TypeScript strict, pnpm + Turborepo monorepo, Node 22, deploy GKE/Docker (**không lock Vercel** — đánh giá self-host của từng framework), team nhỏ, backend NestJS + better-auth. **Dependency EOL <12 tháng = loại trực tiếp.**

**Hiện trạng repo (đã xác minh):** `vitasoft-homepage/package.json` ghim `next ^15.1.4`, `react ^19.0.0`; root là pnpm@9.15.4 + turbo@2.3.3, `engines.node >=22`.

---

## 2. Vòng đời — cổng loại trực tiếp (EOL <12 tháng)

Next.js theo mô hình LTS: mỗi major ở **Active LTS** tới khi major kế tiếp ra, sau đó **Maintenance LTS 2 năm tính từ ngày phát hành major** (chỉ vá bảo mật/bug nghiêm trọng), rồi EOL ([Next.js Support Policy](https://nextjs.org/support-policy); [endoflife.date/nextjs](https://endoflife.date/nextjs), truy cập 2026-07-06).

| Next.js | Phát hành | EOL | Ghi chú |
|---|---|---|---|
| 14 | 2023-10-26 | 2025-10-26 | Đã EOL |
| **15 (repo đang dùng)** | 2024-10-21 | **2026-10-21** | **< 12 tháng → vi phạm gate** |
| **16 (khuyến nghị)** | 2025-10 (major) | ~2027-10 | > 12 tháng → hợp lệ |

Nguồn EOL: [endoflife.date/api/nextjs.json](https://endoflife.date/api/nextjs.json) (truy cập 2026-07-06).

**Kết luận cổng:** Next.js 15.1.4 hiện tại **EOL trong <12 tháng → phải nâng Next 16 bất kể quyết định framework**. Đây chính là lý do "chi phí giữ nguyên hiện trạng" không phải bằng 0 tuyệt đối — nhưng nâng 15→16 rẻ hơn nhiều lần so với đổi framework (có codemod chính thức `@next/codemod`). Các ứng viên khác đều còn hỗ trợ (không ai bị loại vì EOL — xem §3).

---

## 3. Ứng viên & dữ kiện (đã xác minh 2026-07-06)

### Next.js 16 (App Router) — React
- **Phiên bản:** `next` **16.2.10** ([npm registry](https://registry.npmjs.org/next/latest), 2026-07-06). Next 16 ra major ~10/2025; hiện dòng 16.2.x, EOL ~10/2027.
- **Thay đổi lớn v16:** **Turbopack là bundler mặc định** cho dev + build; **React Compiler stable** (`reactCompiler` promoted); `cacheLife`/`cacheTag` stable; dùng React 19.2 (View Transitions, `useEffectEvent`, Activity) ([Next.js 16 blog](https://nextjs.org/blog/next-16); [Upgrading v16](https://nextjs.org/docs/app/guides/upgrading/version-16), 2026-07-06).
- **i18n:** không có i18n built-in cho App Router — dùng lib. **next-intl** là chuẩn de-facto App Router (routing đa ngôn ngữ, RSC support, ICU, TS autocomplete, hỗ trợ hreflang qua Metadata API) ([next-intl App Router](https://next-intl.dev/docs/getting-started/app-router); [Definitive Guide i18n 2026](https://gundogmuseray.medium.com/the-definitive-guide-to-i18n-libraries-for-next-js-react-in-2026-8102c7f68a77), 2026-07-06).
- **SEO:** SSR/SSG/**ISR** đầy đủ, **Metadata API** (`generateMetadata`, `alternates.languages` cho hreflang), hàm `sitemap.ts`/`robots.ts` native, structured data qua JSON-LD ([Next.js Metadata], docs). Mạnh nhất nhóm cho SEO app-shell động.
- **UI:** **Tailwind v4 + shadcn/ui** hỗ trợ Next 16/15 App Router + RSC + React 19 chính thức ([shadcn Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4); [shadcn Next install](https://ui.shadcn.com/docs/installation/next), 2026-07-06).
- **Self-host (GKE/Docker):** document chính thức, `output: 'standalone'`; caveat multi-pod xem §5.
- **Test:** Vitest + Playwright chuẩn, hỗ trợ đầy đủ.

### Astro 7 — agnostic (React/Svelte/Vue qua island)
- **Phiên bản:** `astro` **7.0.6** ([npm registry](https://registry.npmjs.org/astro/latest), 2026-07-06). Astro 7 ra 22/06/2026 (headline: performance); Astro 6 (10/03/2026) đã yêu cầu **Node 22+**, Vite 7, Zod 4, Rust compiler experimental ([Astro 6 blog](https://astro.build/blog/astro-6/); [Astro 7 – YIPPY](https://yippy.com/t/58pzm38rfxxa/), 2026-07-06).
- **i18n:** **routing i18n built-in zero-config** — rất mạnh cho content site ([Astro i18n 2026](https://edgekits.dev/en/blog/astro-i18n-complete-guide-2026/), 2026-07-06).
- **SEO/perf:** **Islands architecture, zero-JS mặc định** → Lighthouse/CWV xuất sắc cho trang tĩnh/nội dung; **Server Islands** cho phần động (avatar, cart). Mạnh nhất nhóm về bundle nhỏ cho content-driven.
- **Điểm yếu cho use case:** khi trang chủ + sản phẩm cần **app-shell động, auth session, nhiều tương tác client**, mô hình island trở nên gượng (phải nhúng framework UI vào island); không phải "app framework" full như Next. Nhân rộng cho Mind (app có auth) sẽ lệch.

### React Router 8 (Framework Mode, hậu thân Remix) — React
- **Phiên bản:** `react-router` **8.1.0** ([npm registry](https://registry.npmjs.org/react-router/latest), 2026-07-06). Remix đã merge vào React Router từ v7 (11/2024); **Remix v2 & React Router v6 đã EOL**; hướng đi hợp nhất tiếp tục ở v7→v8 ([React Router v7 blog](https://remix.run/blog/react-router-v7); [Merging Remix](https://remix.run/blog/merging-remix-and-react-router), 2026-07-06).
- **i18n:** không built-in; dùng `remix-i18next`/`react-i18next` hoặc Paraglide — cần setup thủ công nhiều hơn next-intl.
- **SEO/perf:** SSR + nested routing + progressive enhancement tốt; dựa Vite, bundle-splitting tốt. Nhưng **hệ sinh thái SEO (metadata/sitemap) và i18n kém "pin sẵn" hơn Next** — nhiều thứ tự lắp.
- **Self-host:** dựa Vite/Node → self-host dễ, ít caveat runtime hơn Next (không có ISR-cache-handler drama), nhưng đổi lại thiếu ISR/Metadata-API tiện dụng.

### SvelteKit 2 (Svelte 5) — Svelte
- **Phiên bản:** `@sveltejs/kit` **2.69.1** ([npm registry](https://registry.npmjs.org/@sveltejs/kit/latest), 2026-07-06); Svelte 5 (runes) từ 10/2024, active mạnh, TS 6 support ([What's new in Svelte May 2026](https://svelte.dev/blog/whats-new-in-svelte-may-2026), 2026-07-06).
- **i18n:** **Paraglide JS** là hướng chính thức — compile message thành ESM tree-shakable, **bundle i18n nhỏ tới 70%** ([Paraglide](https://paraglidejs.com/); [github paraglide-js](https://github.com/opral/paraglide-js), 2026-07-06).
- **SEO/perf:** hydration nhẹ, bundle nhỏ, CWV rất tốt; SSR/SSG/adapter đa dạng, self-host dễ qua `adapter-node`.
- **Điểm yếu cho Vitasoft:** **rời hệ React** → không tái dùng được kiến thức/component/patterns với backend team React-leaning; ecosystem UI (shadcn) chủ yếu React (có port Svelte nhưng ít trưởng thành hơn). Chi phí học cho team nhỏ.

### Nuxt 4 — Vue
- **Phiên bản:** `nuxt` **4.4.8** ([npm registry](https://registry.npmjs.org/nuxt/latest); [Nuxt v4 blog](https://nuxt.com/blog/v4), 2026-07-06). Nuxt 4.4 (03/2026) dùng Vue Router v5; Nuxt 3 maintenance tới hết 07/2026.
- **i18n:** `@nuxtjs/i18n` module trưởng thành (routing, hreflang, lazy-load). **SEO/self-host** tốt (Nitro server, deploy Node/Docker dễ).
- **Điểm yếu quyết định:** **hệ Vue, không phải React** → lệch hẳn hướng repo (skeleton React 19) và hệ sinh thái UI/React đã chọn cho Mind. Chi phí chuyển + duy trì hai hệ sinh thái (nếu backend/tooling React) không đáng cho team nhỏ.

---

## 4. Ma trận quyết định có trọng số (7 tiêu chí founder + self-host + chi phí chuyển đổi)

Thang 1–5. Vòng đời là **gate** (đã xử lý ở §2: tất cả ứng viên qua gate; Next.js 15 hiện tại vi phạm nên tính điểm cho **Next.js 16**). Trọng số phản ánh ưu tiên founder + ràng buộc GKE/team nhỏ.

| Tiêu chí | Trọng số | Next.js 16 | Astro 7 | React Router 8 | SvelteKit 2 | Nuxt 4 |
|---|---:|:---:|:---:|:---:|:---:|:---:|
| 1. i18n + SEO hreflang | 5 | 5 (next-intl) | 5 (built-in) | 3 | 4 (Paraglide) | 5 (@nuxtjs/i18n) |
| 2. Đa độ phân giải (responsive) | 3 | 5 | 5 | 5 | 5 | 5 |
| 3. Mode desktop/mobile (responsive đúng chuẩn) | 3 | 5 | 5 | 5 | 5 | 5 |
| 4. Giao tiếp NestJS (API type-safe + better-auth) | 5 | 5 | 3 | 4 | 3 | 4 |
| 5. SEO (SSR/SSG/ISR, metadata, sitemap, structured) | 5 | 5 | 5 (tĩnh) / 3 (động) | 4 | 4 | 5 |
| 6. Best practices (a11y, arch, Vitest+Playwright) | 4 | 5 | 4 | 4 | 4 | 4 |
| 7. Performance (bundle, hydration, CWV) | 4 | 4 | 5 | 4 | 5 | 4 |
| Self-host GKE/Docker (không lock Vercel) | 4 | 4 | 5 | 5 | 5 | 5 |
| Phù hợp hệ React + stack repo (TS, pnpm, turbo) | 4 | 5 | 3 | 5 | 2 | 2 |
| Chi phí chuyển đổi (từ skeleton Next hiện có) | 4 | 5 (chỉ nâng 15→16) | 2 | 3 | 2 | 1 |
| Chi phí học + vận hành (team nhỏ) | 3 | 4 | 4 | 4 | 3 | 3 |
| **Tổng có trọng số** (max 220) | | **207** | **170** | **178** | **160** | **166** |

**Cách tính:** điểm × trọng số, cộng dồn. Next.js 16 dẫn đầu rõ nhờ điểm mạnh ở các trục trọng số cao nhất (i18n, giao tiếp NestJS, SEO động) **cộng** hai trục thực dụng: phù hợp hệ React của repo và chi phí chuyển đổi gần bằng 0. Astro thắng tuyệt đối ở perf trang tĩnh nhưng mất điểm ở "app-shell động + giao tiếp NestJS + chi phí chuyển". React Router là á quân — cùng hệ React, self-host sạch — nhưng SEO/i18n kém "pin sẵn" hơn Next và vẫn tốn công chuyển.

---

## 5. Phân tích trung thực 2 câu hỏi founder nhấn mạnh

### 5.1 Mode desktop/mobile: responsive hay adaptive?

**Khuyến nghị: responsive design** (một cây layout, fluid grid + media query + **container query**), **không** adaptive serving/device-detection theo User-Agent.

Cơ sở (2026, chính thống ngành thiết kế): responsive là **mặc định** vì future-proof, rẻ hơn, ít maintenance, một codebase; CSS hiện đại (Container Queries, Subgrid, `:has()`, fluid typography với `clamp()`) cho phép responsive tới cấp component. **Adaptive** (dựng nhiều layout cố định, chọn theo device) chỉ đáng khi "mỗi pixel và millisecond đều quý" — dashboard trading, set-top box ([Responsive vs Adaptive 2026 – UXPin](https://www.uxpin.com/studio/blog/responsive-vs-adaptive-design-whats-best-choice-designers/); [Responsive Best Practices 2026 – PxlPeak](https://pxlpeak.com/blog/web-design/responsive-design-best-practices), 2026-07-06).

**Tại sao adaptive/UA-sniffing SAI cho trang chủ Vitasoft:** (a) SEO — Google khuyến nghị responsive; phục vụ HTML khác nhau theo UA dễ gây cloaking/duplicate và khó hreflang nhất quán; (b) với RSC/SSR + CDN cache, "vary theo User-Agent" phá hiệu quả cache; (c) độ phân giải 4K→mobile là dải liên tục, dựng vài breakpoint cứng không phủ hết. **Cách đúng:** một layout responsive; nếu cần khác biệt lớn desktop/mobile thì **conditionally render component** dựa trên CSS/container query hoặc client hint hợp lệ, **không** tách bản dựng theo UA.

### 5.2 Next.js self-host ngoài Vercel: hạn chế thật là gì?

**Kết luận thẳng: KHÔNG khóa vào Vercel.** Next.js self-host trên Node server/Docker/GKE được document chính thức ([Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting), lastUpdated 2026-03-25, v16.2.10, truy cập 2026-07-06). Nhưng **có phí tổn cấu hình thật, đặc biệt multi-pod trên GKE** — cần biết trước:

| Vấn đề self-host | Thực chất | Giảm thiểu |
|---|---|---|
| **Image optimization** | `next/image` chạy self-host zero-config với `next start`, nhưng dựa **`sharp`** (native binding) — build trên macOS rồi copy vào Alpine sẽ hỏng; glibc cần cấu hình memory allocator | Cài `sharp` trong build stage đúng target Linux; hoặc **offload sang custom image loader/CDN** (Cloudflare/Imgix); hoặc `unoptimized` nếu ảnh đã tối ưu sẵn |
| **ISR / cache đa pod** | Cache mặc định ở **local disk từng instance** → mỗi pod K8s một bản, dễ lệch/stale | Cấu hình **custom `cacheHandler` + Redis** (có example chính thức `cache-handler-redis`); set `cacheMaxMemorySize: 0` |
| **Server Actions đa instance** | Mỗi build sinh encryption key riêng → "Failed to find Server Action" khi client hit pod khác | Set **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** dùng chung mọi instance |
| **Rolling deploy / version skew** | Client cầm asset build cũ hit pod build mới → 404 asset/navigation fail | Set **`deploymentId`** (vd git hash) → Next hard-navigate khi lệch |
| **Static assets dưới tải cao** | Node server serve static không tối ưu bằng CDN | Đặt CDN/`assetPrefix` trước; reverse proxy (nginx) cho security/streaming |
| **Streaming/PPR qua proxy** | LB/proxy buffer sẽ giết streaming | Disable buffering (`X-Accel-Buffering: no`), LB hỗ trợ chunked/HTTP2 |
| **Graceful shutdown** | Cần drain in-flight + `after()` callbacks | Gửi SIGTERM, drain 10–30s (khớp `terminationGracePeriodSeconds` GKE) |

**Đánh giá:** đây là **checklist một lần** khi dựng Dockerfile + Helm chart, không phải hạn chế cản trở. So sánh: Astro/SvelteKit/React Router (Vite/Node adapter) **ít caveat runtime hơn** (không có ISR-cache-handler), nên nếu self-host là ưu tiên số một tuyệt đối thì các framework này "sạch" hơn — nhưng đổi lại mất Metadata API/ISR pin-sẵn của Next. Với Vitasoft (đã có Redis trong stack, đã dùng GKE), phí tổn Next self-host là **chấp nhận được và đã có sẵn công cụ**.

---

## 6. Khuyến nghị

**Chọn: Next.js 16 (App Router, RSC) — nâng skeleton hiện tại từ 15.1.4 lên 16.**

Next.js 16 là lựa chọn duy nhất đạt mạnh **đồng thời cả 7 tiêu chí founder** trong khi vẫn nằm trong hệ React của repo và có chi phí chuyển gần bằng 0. Nó thắng ở đúng các trục quan trọng nhất cho một trang chủ đa sản phẩm **có phần động + auth + nhân rộng cho app Mind**: SEO động (Metadata API + ISR + sitemap native), i18n chuẩn de-facto (next-intl), và giao tiếp type-safe với NestJS. Các ứng viên khác đều xuất sắc ở một mặt nhưng lệch mục tiêu: Astro tối ưu content tĩnh (yếu app-shell động), SvelteKit/Nuxt rời hệ React (chi phí học + hệ sinh thái UI). Việc **bắt buộc** nâng 15→16 (vì Next 15 EOL 10/2026) biến quyết định "giữ Next" thành hành động cụ thể có deadline, không phải giữ nguyên thụ động.

### Stack đi kèm cụ thể (theo 7 tiêu chí)

| Nhu cầu | Chọn | Lý do (nguồn) |
|---|---|---|
| **i18n (TC1)** | **next-intl** | Chuẩn de-facto App Router, RSC + routing + hreflang qua `alternates.languages`, ICU, TS autocomplete; bắt đầu vi/en ([next-intl](https://next-intl.dev/docs/getting-started/app-router)) |
| **UI + responsive (TC2,3,6)** | **Tailwind CSS v4 + shadcn/ui** | Hỗ trợ Next 16 + RSC + React 19 chính thức; responsive (container query) + a11y primitives (Radix) ([shadcn Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)) |
| **API client type-safe (TC4)** | **openapi-typescript + openapi-fetch** | NestJS export OpenAPI qua `@nestjs/swagger`; codegen types zero-runtime + fetch nhẹ, platform-agnostic (khuyến nghị chung cho NestJS thay vì tRPC — NestJS router không map sạch sang tRPC) ([Orval vs openapi-typescript 2026](https://www.pkgpulse.com/guides/orval-vs-openapi-typescript-vs-kubb-openapi-client-2026)). Cân nhắc **Orval** nếu muốn sinh sẵn TanStack Query hooks |
| **Auth (TC4)** | **better-auth cookie relay** | Forward cookie browser→Next→NestJS; dùng `set-cookie-parser` + `cookies().set()`. **Luôn validate session ở server**, không tin `getSessionCookie` (chỉ check tồn tại) ([better-auth Next](https://better-auth.com/docs/integrations/next); [LogRocket auth 2026](https://blog.logrocket.com/best-auth-library-nextjs-2026/)) |
| **SEO (TC5)** | Next Metadata API + `sitemap.ts` + `robots.ts` + JSON-LD | Native, không lib thêm |
| **Image optimization self-host (TC7)** | **next/image + sharp (build Linux) + CDN loader** | Xem §5.2 |
| **Test (TC6)** | **Vitest + Playwright** | Đã là chuẩn repo (`quality-standards`) |
| **Perf (TC7)** | Turbopack (mặc định v16) + React Compiler stable + RSC | Giảm client JS, tối ưu prefetch/navigation |

### Rủi ro chính & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **Next 15 EOL 21/10/2026** (repo đang 15.1.4) | **Cao (deadline cứng)** | Nâng lên **Next 16 ngay trong phase này** bằng `@next/codemod upgrade`; đặt Dependabot theo dõi major |
| Self-host multi-pod trên GKE (ISR cache, encryption key, deploymentId, sharp) | Trung bình | Áp checklist §5.2 khi dựng Dockerfile + Helm: Redis cacheHandler, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `deploymentId=GIT_HASH`, sharp target Linux; CDN trước static |
| Turbopack mặc định (v16) còn edge case với plugin cũ | Thấp–TB | Turbopack đã stable cho build ở v16; giữ khả năng fallback webpack nếu plugin chưa tương thích; CI build kiểm tra |
| better-auth cookie relay qua Next↔NestJS decoupled dễ sai (cookie không set) | Trung bình | Dùng đúng pattern relay + validate session server-side; viết Playwright e2e cho login flow (đã có issue thực tế #2434) |
| Vendor lock nhẹ về feature Vercel-only (nếu lỡ dùng) | Thấp | Chỉ dùng feature có trong self-host doc; tránh `@vercel/*` runtime; đã xác nhận không lock (§5.2) |

### Lý do loại (1 dòng mỗi phương án)

- **Astro 7:** Vô địch content tĩnh/CWV nhưng mô hình island gượng cho trang chủ có app-shell động + auth và nhân rộng cho app Mind — lệch mục tiêu "framework cho cả sản phẩm có tương tác".
- **React Router 8:** Cùng hệ React và self-host sạch (á quân), nhưng SEO/i18n kém "pin sẵn" hơn Next (phải tự lắp Metadata/sitemap/i18n) và vẫn tốn chi phí chuyển khỏi skeleton Next hiện có.
- **SvelteKit 2:** Perf/bundle xuất sắc nhưng rời hệ React → chi phí học cho team nhỏ + hệ sinh thái UI (shadcn) và tái dùng kiến thức kém tương thích repo.
- **Nuxt 4:** Hệ Vue, lệch hẳn skeleton React 19 của repo và hướng UI đã chọn — chi phí duy trì hai hệ sinh thái không đáng cho team nhỏ.

---

## 7. Ghi chú độ tin cậy & điểm chưa xác minh

- **Phiên bản** lấy từ **npm registry API** (chính thức): next 16.2.10, astro 7.0.6, react-router 8.1.0, @sveltejs/kit 2.69.1, nuxt 4.4.8 (truy cập 2026-07-06).
- **EOL Next.js** từ **endoflife.date** + **Next.js Support Policy chính thức** (2-year Maintenance LTS từ ngày phát hành major) — đối chiếu khớp: Next 15 EOL 2026-10-21, Next 16 ~2027-10.
- **Self-host caveats** lấy từ **trang self-hosting chính thức của Next.js** (v16.2.10, lastUpdated 2026-03-25) — nguồn có thẩm quyền cao nhất cho phần "hạn chế thật".
- **Responsive vs adaptive**: nguồn là blog ngành thiết kế UX (UXPin, PxlPeak) — dùng làm best-practice/bối cảnh, kết luận nhất quán với khuyến nghị Google về responsive (không có tranh cãi lớn trong ngành 2026).
- **Điểm số ma trận** là đánh giá định tính có trọng số của research-analyst dựa dữ kiện đã xác minh — **không phải benchmark tuyệt đối**; leader có thể chỉnh trọng số nếu ưu tiên khác (vd nếu trang chủ hoàn toàn tĩnh, Astro sẽ tiệm cận Next).
- **Chưa xác minh bằng số tuyệt đối:** điểm Lighthouse/CWV thực tế của từng framework cho *chính* codebase Vitasoft (phụ thuộc cách build) — dùng đặc tính kiến trúc (RSC vs islands vs hydration) làm căn cứ định tính thay vì con số benchmark bên thứ ba dễ thiên lệch.

---

*Báo cáo tạo bởi research-analyst theo skill `deep-research` + `quality-standards`. Mọi dữ kiện quan trọng kèm nguồn + ngày truy cập 2026-07-06.*
