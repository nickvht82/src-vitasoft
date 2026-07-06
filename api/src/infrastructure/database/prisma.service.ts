import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { getPrismaClient, type PrismaClient } from "@vitasoft/database";

/**
 * Injectable wrapper around the shared `@vitasoft/database` singleton.
 *
 * Exposes the Prisma client to adapters via DI and owns its lifecycle:
 * connections open lazily on first query, and are closed on module shutdown so
 * `enableShutdownHooks()` drains cleanly. Connect is intentionally lazy so the
 * API can boot (and serve `/health/live`) even when Postgres is not yet up.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = getPrismaClient();

  /** Probe connectivity for readiness checks. Returns false instead of throwing. */
  async ping(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
