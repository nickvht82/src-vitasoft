import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { AiTasksQueue, type EchoJobData } from "../ai-tasks.queue.js";
import {
  GetJobStatusQuery,
  type JobStatus,
} from "./get-job-status.query.js";

/**
 * Reads a job's status from BullMQ, scoped to the caller who owns it. Returns
 * `null` when the job id is unknown *or* belongs to another user — both render
 * as a clean 404, so an attacker cannot enumerate sequential ids to read other
 * users' results or confirm a job's existence (OWASP A01: broken access
 * control / IDOR).
 */
@QueryHandler(GetJobStatusQuery)
export class GetJobStatusHandler
  implements IQueryHandler<GetJobStatusQuery, JobStatus | null>
{
  constructor(private readonly aiTasks: AiTasksQueue) {}

  async execute(query: GetJobStatusQuery): Promise<JobStatus | null> {
    const job = await this.aiTasks.queue.getJob(query.jobId);
    if (!job) return null;
    // Ownership check: only the enqueuing user may read the job. A mismatch is
    // treated identically to "not found" to avoid leaking existence.
    const data = job.data as EchoJobData;
    if (data.ownerUserId !== query.callerUserId) return null;
    const state = await job.getState();
    return {
      id: job.id ?? query.jobId,
      state,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  }
}
