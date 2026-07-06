# @vitasoft/api — Core Backend API

NestJS 11 (Fastify adapter, ESM) core API. Modular monolith, built with
**Clean Architecture / Hexagonal (Ports & Adapters)** plus **Repository Pattern**,
**DI/IoC** (NestJS container), and **CQRS** (`@nestjs/cqrs`).

Runs on port **3001**, all routes under **`/v1`**. Swagger at **`/docs`** (non-production only).

## Clean Architecture — the dependency rule

Each feature module under `src/modules/<module>/` has four layers. Dependencies
point **inward**: outer layers know inner ones, never the reverse.

```
                 depends on ─────────────▶
  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
  │ presentation  │──▶│  application  │──▶│    domain     │
  │ controller +  │   │  commands /   │   │  entities +   │
  │ DTO (zod)     │   │  queries +    │   │  repository   │
  │ CommandBus /  │   │  handlers     │   │  PORT (iface  │
  │ QueryBus      │   │  (@nestjs/cqrs)│  │  + token)     │
  └───────────────┘   └───────────────┘   └───────▲───────┘
                                                   │ implements
                                          ┌────────┴───────┐
                                          │ infrastructure │
                                          │ Prisma ADAPTER │
                                          └────────────────┘

  presentation ──▶ application ──▶ domain
  infrastructure ──implements──▶ domain (PORT)
  domain imports NOTHING from the other three layers.
```

Rules:

- **domain/** — pure TypeScript entities and the repository **PORT** (interface +
  injection token). No NestJS, no Prisma, no HTTP. The stable core.
- **application/** — CQRS commands, queries, and handlers. Depends **only** on the
  domain. Handlers receive the repository PORT via DI, so they are unit-tested
  against an in-memory fake — no database.
- **infrastructure/** — Prisma **ADAPTER** implementing the domain PORT. The only
  place that imports Prisma for a given aggregate.
- **presentation/** — controller + zod DTOs. Calls `CommandBus`/`QueryBus`, never
  a service or repository directly. Maps domain errors to HTTP exceptions.

The PORT↔ADAPTER binding lives in the module (`useClass`), the single DI seam
that makes the whole flow testable and swappable.

## Example module: `organizations`

`Organization` entity · `CreateOrganizationCommand` · `GetOrganizationQuery` +
`ListOrganizationsQuery` · `OrganizationRepository` PORT + `PrismaOrganizationRepository`
ADAPTER · controller `POST /v1/organizations`, `GET /v1/organizations/:id`,
`GET /v1/organizations`.

## Commands

```sh
pnpm --filter @vitasoft/api dev        # watch mode
pnpm --filter @vitasoft/api build      # tsc → dist/
pnpm --filter @vitasoft/api test       # vitest + coverage
docker compose up                      # api + postgres + redis (repo root)
```

## Not in scope (later increments)

better-auth + RBAC guards, throttler/idempotency, BullMQ jobs, OpenTelemetry,
tenant-scoping Prisma middleware.
