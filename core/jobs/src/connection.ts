import type { ConnectionOptions } from "bullmq";

/**
 * Parse a `redis://` / `rediss://` URL into BullMQ {@link ConnectionOptions}.
 *
 * Pure and dependency-light (uses the WHATWG `URL`), so connection wiring is
 * unit-testable without a live Redis. `maxRetriesPerRequest: null` is required
 * by BullMQ workers (blocking commands must not give up), so it is set here once.
 *
 * @param url - A Redis connection URL, e.g. `redis://localhost:6379`.
 * @returns BullMQ connection options (host, port, credentials, TLS, db).
 * @throws Error when `url` is not a valid redis/rediss URL.
 * @example
 * const connection = parseRedisConnection("redis://localhost:6379");
 */
export function parseRedisConnection(url: string): ConnectionOptions {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid REDIS_URL: "${url}" is not a valid URL.`);
  }
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error(
      `Invalid REDIS_URL protocol "${parsed.protocol}" — expected redis: or rediss:.`,
    );
  }

  const options: ConnectionOptions & Record<string, unknown> = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    // Required by BullMQ workers: blocking commands must never bail out.
    maxRetriesPerRequest: null,
  };
  if (parsed.username) options.username = parsed.username;
  if (parsed.password) options.password = parsed.password;
  if (parsed.protocol === "rediss:") options.tls = {};

  // Path like `/2` selects Redis logical database 2.
  const db = parsed.pathname.replace(/^\//, "");
  if (db) options.db = Number(db);

  return options;
}
