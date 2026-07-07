import {
  type ConnectionOptions,
  type Job,
  Queue,
  type Processor,
  Worker,
  type WorkerOptions,
} from "bullmq";
import { parseRedisConnection } from "./connection.js";

/**
 * Options for {@link createQueue} / {@link createWorker}. Exactly one of
 * `redisUrl` or `connection` is used — `redisUrl` is the common path.
 */
export interface QueueFactoryOptions {
  /** Redis URL; parsed into a BullMQ connection. */
  readonly redisUrl?: string;
  /** Pre-built BullMQ connection options (takes precedence over `redisUrl`). */
  readonly connection?: ConnectionOptions;
}

/** Resolve the effective BullMQ connection from the factory options. */
function resolveConnection(options: QueueFactoryOptions): ConnectionOptions {
  if (options.connection) return options.connection;
  if (options.redisUrl) return parseRedisConnection(options.redisUrl);
  throw new Error(
    "createQueue/createWorker requires either `redisUrl` or `connection`.",
  );
}

/**
 * Create a typed BullMQ {@link Queue}. `TData` is the job payload type and
 * `TName` the allowed job-name literal(s), so producers cannot enqueue the wrong
 * shape.
 *
 * @param name - The queue name (must match the worker's).
 * @param options - Redis connection.
 * @returns A typed queue instance.
 * @example
 * const queue = createQueue<{ text: string }, "echo">("ai-tasks", { redisUrl });
 * await queue.add("echo", { text: "hi" });
 */
export function createQueue<TData, TName extends string = string>(
  name: string,
  options: QueueFactoryOptions,
): Queue<TData, unknown, TName> {
  return new Queue<TData, unknown, TName>(name, {
    connection: resolveConnection(options),
  });
}

/**
 * Create a typed BullMQ {@link Worker} bound to the same queue name. The
 * processor receives strongly-typed jobs.
 *
 * @param name - The queue name (must match the queue's).
 * @param processor - Async job handler; its return value becomes the job result.
 * @param options - Redis connection plus optional BullMQ worker overrides.
 * @returns A running worker instance.
 * @example
 * const worker = createWorker<{ text: string }, string, "echo">(
 *   "ai-tasks",
 *   async (job) => job.data.text,
 *   { redisUrl },
 * );
 */
export function createWorker<
  TData,
  TResult = unknown,
  TName extends string = string,
>(
  name: string,
  processor: Processor<TData, TResult, TName>,
  options: QueueFactoryOptions & Partial<WorkerOptions>,
): Worker<TData, TResult, TName> {
  const { redisUrl, connection, ...workerOptions } = options;
  return new Worker<TData, TResult, TName>(name, processor, {
    ...workerOptions,
    connection: resolveConnection({ redisUrl, connection }),
  });
}

export { Queue, Worker, type Job, type Processor };
