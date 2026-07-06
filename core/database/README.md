# @vitasoft/database

Shared Prisma schema and client for every Vitasoft backend. One schema, one
generated client version — the data model never drifts between products.

## Usage

```ts
import { getPrismaClient } from "@vitasoft/database";

const prisma = getPrismaClient(); // process-wide singleton (one connection pool)
const orgs = await prisma.organization.findMany();
```

For tests that need an isolated client, use `createPrismaClient({ datasourceUrl })`.

## Multi-tenancy

`organizationId` is the tenant key on business tables (see `ARCHITECTURE.md` §5.2).
The `User` model carries it from day one so tenant scoping works before the auth
module lands.

## Commands

- `pnpm --filter @vitasoft/database prisma:generate` — regenerate the client.
- `pnpm --filter @vitasoft/database prisma:migrate` — create a dev migration (needs a running DB).

## Not in scope

Tenant-scoping Prisma middleware, RLS, migration CD wiring, field-level KMS
encryption — later increments.
