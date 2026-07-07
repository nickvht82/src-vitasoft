import type { PrismaClient } from "./generated/client/client.js";

/**
 * Models that carry a tenant key (`organizationId`) and must be scoped to the
 * active tenant. `Organization` is the tenant root itself, so it is *not* listed
 * — it is not scoped by an organization id.
 *
 * @remarks
 * To make a future model tenant-scoped, add its Prisma model name here (and give
 * it an `organizationId` column). No other change is needed — the extension
 * reads this list.
 */
export const TENANT_MODELS: readonly string[] = ["User"];

/** Column every tenant model uses as its tenant key. */
export const TENANT_KEY = "organizationId";

/**
 * Supplies the active tenant id for the current execution context. Returning
 * `undefined` means "no tenant bound" — the extension then leaves queries
 * unscoped (e.g. during sign-up, background jobs, or admin/system operations).
 * In a request, this is backed by AsyncLocalStorage (nestjs-cls) in the app.
 */
export type TenantIdProvider = () => string | undefined;

/** Prisma operations that read rows and therefore need a tenant `where` filter. */
const READ_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

/** Prisma operations that mutate existing rows and must be tenant-bounded. */
const BULK_WRITE_OPERATIONS = new Set([
  "updateMany",
  "deleteMany",
]);

/**
 * Single-record mutations addressed by a unique `where` (`{ id }` / `{ email }`).
 * Left unscoped, a caller who knows another tenant's row id could mutate or
 * delete it. We bind them to the active tenant by adding `organizationId` as an
 * extra scalar filter on the unique `where` — Prisma supports "unique + extra
 * conditions", so a non-matching row raises `P2025` (Record not found) instead
 * of crossing the tenant boundary.
 */
const SINGLE_WRITE_OPERATIONS = new Set([
  "update",
  "delete",
  "upsert",
]);

/**
 * True when the operation targets a tenant-scoped model and a tenant is active.
 * Shared guard so read and write branches stay in sync.
 */
function shouldScope(
  model: string | undefined,
  tenantId: string | undefined,
): model is string {
  return (
    tenantId !== undefined &&
    model !== undefined &&
    TENANT_MODELS.includes(model)
  );
}

/**
 * Merge a tenant filter into an existing `where`, without dropping the caller's
 * own conditions. The tenant key always wins (a caller cannot widen past it).
 */
function withTenantWhere(
  args: { where?: Record<string, unknown> } | undefined,
  tenantId: string,
): Record<string, unknown> {
  const existing = args?.where ?? {};
  return { ...args, where: { ...existing, [TENANT_KEY]: tenantId } };
}

/**
 * Build a Prisma Client extension that transparently scopes tenant models to
 * the id returned by `getTenantId`. Reads gain a `where organizationId` filter;
 * bulk writes (updateMany/deleteMany) and single-record mutations
 * (update/delete/upsert) are bounded the same way, so a missing filter in
 * application code — or a caller who knows another tenant's row id — can never
 * read, mutate, or delete across tenants.
 *
 * @param getTenantId - Resolver for the active tenant id (per async context).
 * @returns A Prisma `$extends` argument — apply with `prisma.$extends(ext)`.
 * @example
 * const scoped = prisma.$extends(createTenantScopeExtension(() => cls.get("tenantId")));
 */
export function createTenantScopeExtension(getTenantId: TenantIdProvider) {
  return {
    name: "vitasoft-tenant-scope",
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model?: string;
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          const tenantId = getTenantId();
          if (tenantId === undefined || !shouldScope(model, tenantId)) {
            return query(args);
          }
          if (
            READ_OPERATIONS.has(operation) ||
            BULK_WRITE_OPERATIONS.has(operation) ||
            SINGLE_WRITE_OPERATIONS.has(operation)
          ) {
            // Read + bulk-write + single-record mutation (update/delete/upsert)
            // all gain the tenant filter on their `where`. For single-record
            // ops this turns a bare `{ id }` into `{ id, organizationId }`, so a
            // row belonging to another tenant is not found (Prisma raises P2025)
            // rather than being written across the boundary.
            return query(
              withTenantWhere(
                args as { where?: Record<string, unknown> } | undefined,
                tenantId,
              ),
            );
          }
          // `create` falls through unscoped: it has no `where`, and the caller
          // sets the tenant key directly in `data`. Scoping create is a
          // separate, deliberate concern.
          return query(args);
        },
      },
    },
  };
}

/** The concrete return type of {@link createTenantScopeExtension}. */
export type TenantScopeExtension = ReturnType<
  typeof createTenantScopeExtension
>;

/**
 * Apply the tenant-scope extension to a client. Thin helper so app code does not
 * need to know the `$extends` shape.
 *
 * @param client - A base Prisma client.
 * @param getTenantId - Resolver for the active tenant id.
 * @returns An extended client that auto-scopes tenant models.
 */
export function withTenantScope(
  client: PrismaClient,
  getTenantId: TenantIdProvider,
) {
  return client.$extends(createTenantScopeExtension(getTenantId));
}
