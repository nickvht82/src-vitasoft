import type { ClsService } from "nestjs-cls";

/**
 * CLS key under which the active tenant (organization) id is stored for the
 * duration of a request. Kept in one place so the setter (AuthGuard) and the
 * reader (PrismaService tenant-scope) can never drift.
 */
export const TENANT_ID_CLS_KEY = "tenantId";

/**
 * Read the active tenant id from CLS, or undefined when none is bound (public
 * routes, sign-up, background work). Pure adapter over {@link ClsService} so the
 * `@vitasoft/database` tenant provider stays framework-agnostic.
 *
 * @param cls - The request-scoped CLS service.
 * @returns The active tenant id, or undefined.
 */
export function readTenantId(cls: ClsService): string | undefined {
  return cls.get<string | undefined>(TENANT_ID_CLS_KEY);
}
