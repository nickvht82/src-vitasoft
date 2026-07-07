/**
 * @vitasoft/jobs — thin, typed BullMQ wrappers for Vitasoft background jobs.
 *
 * @remarks
 * - `createQueue` / `createWorker` are typed factories over BullMQ that take a
 *   `redisUrl` and enforce payload/name types at the call site.
 * - `parseRedisConnection` turns a `redis://` URL into BullMQ connection options
 *   (with the `maxRetriesPerRequest: null` workers require).
 * - Products never import `bullmq` directly — this package is the single seam,
 *   so queue conventions (retries, connection) change in one place.
 */
export {
  createQueue,
  createWorker,
  Queue,
  Worker,
  type Job,
  type Processor,
  type QueueFactoryOptions,
} from "./queue.js";
export { parseRedisConnection } from "./connection.js";
