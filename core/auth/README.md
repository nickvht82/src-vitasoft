# @vitasoft/auth

better-auth setup and NestJS guards for Vitasoft. The single seam for
authentication — products never import `better-auth` directly.

## Usage

```ts
import { createAuth, AUTH_INSTANCE, AuthGuard, RolesGuard, Roles } from "@vitasoft/auth";

// 1. Build the instance (email+password + organization multi-tenancy).
const auth = createAuth({ prisma, secret, baseURL: "http://localhost:3001" });

// 2. Provide it under AUTH_INSTANCE, mount `auth.handler` under /v1/auth/*.
// 3. Guard routes:
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
@Post()
create() {}
```

Roles: `admin` ⊇ `operator` ⊇ `member` (organization-scoped).

## Not in scope

- Resource-level ReBAC / OpenFGA (future `@vitasoft/authz-fga`).
- Service-to-service JWT/API keys (added when a second service exists).
- The Prisma schema itself — auth tables live in `@vitasoft/database`.
