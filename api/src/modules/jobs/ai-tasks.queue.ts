import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { loadEnv } from "@vitasoft/config";
import { createQueue, createWorker, type Queue, type Worker } from "@vitasoft/jobs";

/** The one queue this increment demonstrates. */
export const AI_TASKS_QUEUE = "ai-tasks";

/** Job name for the demo echo job. */
export const ECHO_JOB = "echo";

/** Payload for an {@link ECHO_JOB}. */
export interface EchoJobData {
  readonly text: string;
  /**
   * Owner of the job — the id of the user who enqueued it. Persisted so that
   * `GET /v1/jobs/:id` can enforce ownership (a caller may only read their own
   * jobs). Never derived from client input; set from the authenticated context.
   */
  readonly ownerUserId: string;
  /** The owner's active organization (tenant), when they were in one. */
  readonly ownerOrganizationId?: string;
}

/** Result the echo worker returns (proves round-trip produce→consume). */
export interface EchoJobResult {
  readonly echoed: string;
  readonly processedAt: string;
}

/**
 * Owns the `ai-tasks` BullMQ queue and its in-process worker. The worker runs in
 * the API process for now (a dedicated worker deployment comes later); it drains
 * gracefully on shutdown so in-flight jobs are not dropped.
 *
 * @remarks
 * The `echo` job simply echoes its text — it does **not** call Claude. Its only
 * purpose is to prove the produce/consume flow end-to-end with a real Redis.
 */
@Injectable()
export class AiTasksQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiTasksQueue.name);
  // The queue's result type is `unknown` — the *worker* owns the result shape
  // (EchoJobResult). BullMQ models it this way, so we keep the queue result open.
  readonly queue: Queue<EchoJobData, unknown, string>;
  private worker?: Worker<EchoJobData, EchoJobResult, string>;

  constructor() {
    const redisUrl = AiTasksQueue.resolveRedisUrl();
    this.queue = createQueue<EchoJobData, string>(AI_TASKS_QUEUE, { redisUrl });
  }

  onModuleInit(): void {
    const redisUrl = AiTasksQueue.resolveRedisUrl();
    this.worker = createWorker<EchoJobData, EchoJobResult, string>(
      AI_TASKS_QUEUE,
      async (job) => ({
        echoed: job.data.text,
        processedAt: new Date().toISOString(),
      }),
      { redisUrl },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.error(`job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    // Drain the worker first (finish in-flight jobs), then close the queue.
    await this.worker?.close();
    await this.queue.close();
  }

  /** Resolve REDIS_URL from validated config, failing fast when absent. */
  private static resolveRedisUrl(): string {
    const { REDIS_URL } = loadEnv();
    if (!REDIS_URL) {
      throw new Error(
        "REDIS_URL is required for @vitasoft/api jobs but was not set. " +
          "Set it in the environment (see api/.env.example).",
      );
    }
    return REDIS_URL;
  }
}
