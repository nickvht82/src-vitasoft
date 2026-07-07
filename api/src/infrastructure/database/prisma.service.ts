import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { loadEnv } from "@vitasoft/config";
import {
  getPrismaClient,
  type PrismaClient,
  withTenantScope,
} from "@vitasoft/database";
import { ClsService } from "nestjs-cls";
import { readTenantId } from "../tenant/tenant-context.js";

/**
 * Resolve the validated Postgres connection string, failing fast when absent.
 *
 * `DATABASE_URL` is optional in the shared config schema (some services never
 * touch a DB), but the API cannot function without it — so we enforce it here at
 * the boundary rather than letting `@vitasoft/database` silently build a client
 * that can never connect (QA finding F-01).
 *
 * @throws Error when `DATABASE_URL` is missing from the validated environment.
 */
function resolveDatabaseUrl(): string {
  const { DATABASE_URL } = loadEnv();
  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for @vitasoft/api but was not set. " +
        "Set it in the environment (see api/.env.example).",
    );
  }
  return DATABASE_URL;
}

/** The tenant-scoped Prisma client type (base client `$extends` the scope). */
type ScopedClient = ReturnType<typeof withTenantScope>;

/**
 * Injectable wrapper around the shared `@vitasoft/database` singleton.
 *
 * `client` is **tenant-scoped**: reads/bulk-writes on tenant models are filtered
 * to the active organization taken from CLS (nestjs-cls) at query time, so a
 * repository that forgets to filter still cannot leak another tenant's rows.
 * Connections open lazily on first query and close on module shutdown so
 * `enableShutdownHooks()` drains cleanly. A missing `DATABASE_URL` fails fast
 * when this service is constructed.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly base: PrismaClient = getPrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
  });

  /** Tenant-scoped client — use this for all product/model access. */
  readonly client: ScopedClient;

  constructor(private readonly cls: ClsService) {
    this.client = withTenantScope(this.base, () => readTenantId(this.cls));
  }

  /**
   * The un-scoped base client. Only for infrastructure that legitimately spans
   * tenants — currently better-auth, which manages its own tables and creates
   * users at sign-up before any tenant exists. Product code must use {@link client}.
   */
  get unscoped(): PrismaClient {
    return this.base;
  }

  /** Probe connectivity for readiness checks. Returns false instead of throwing. */
  async ping(): Promise<boolean> {
    try {
      await this.base.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.base.$disconnect();
  }
}
