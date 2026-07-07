import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client/client.js";

/**
 * Options accepted by {@link createPrismaClient}.
 */
export interface PrismaClientOptions {
  /**
   * Postgres connection string. **Required** — callers must pass a value that
   * has already been validated (e.g. via `@vitasoft/config` `loadEnv()`). The
   * factory does not read `process.env` so that a missing/invalid `DATABASE_URL`
   * fails fast at the config boundary rather than surfacing as a runtime query
   * error deep inside a request (see QA finding F-01).
   */
  readonly datasourceUrl: string;
  /** Prisma log levels to emit. Defaults to warnings and errors only. */
  readonly log?: readonly ("query" | "info" | "warn" | "error")[];
}

/**
 * Build a fresh {@link PrismaClient} backed by the `pg` driver adapter (Prisma 7
 * requires an explicit adapter). Prefer {@link getPrismaClient} in app code — this
 * factory exists so tests can spin up an isolated client without touching the
 * process-wide singleton.
 *
 * @param options - Connection string (required) and logging overrides.
 * @returns A newly constructed, not-yet-connected Prisma client.
 * @throws Error when `datasourceUrl` is empty — fail fast instead of silently
 *   constructing a client that can never connect.
 */
export function createPrismaClient(
  options: PrismaClientOptions,
): PrismaClient {
  const connectionString = options.datasourceUrl;
  if (!connectionString) {
    throw new Error(
      "createPrismaClient requires a non-empty datasourceUrl. Pass a validated " +
        "DATABASE_URL from @vitasoft/config loadEnv().",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: [...(options.log ?? ["warn", "error"])],
  });
}

/**
 * Symbol under which the singleton is cached on `globalThis`. Using a symbol
 * (not a bare property) avoids collisions and survives module reloads during
 * dev/HMR without leaking a new connection pool on every reload.
 */
const SINGLETON_KEY = Symbol.for("vitasoft.prisma.client");

type GlobalWithPrisma = typeof globalThis & {
  [SINGLETON_KEY]?: PrismaClient;
};

/**
 * Return the process-wide Prisma singleton, creating it on first call.
 * A single client (and therefore a single connection pool) per process is the
 * Prisma-recommended pattern — constructing many clients exhausts DB connections.
 *
 * @param options - Connection string (required) applied only when the singleton
 *   is created the first time. Subsequent calls ignore it and return the cache.
 * @returns The shared Prisma client.
 * @throws Error when the singleton does not yet exist and `datasourceUrl` is empty.
 */
export function getPrismaClient(options: PrismaClientOptions): PrismaClient {
  const globalRef = globalThis as GlobalWithPrisma;
  globalRef[SINGLETON_KEY] ??= createPrismaClient(options);
  return globalRef[SINGLETON_KEY];
}

export { PrismaClient };
export type {
  Account,
  Invitation,
  Member,
  Organization,
  Session,
  User,
  Verification,
} from "./generated/client/client.js";
