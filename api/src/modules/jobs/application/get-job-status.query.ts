import { Query } from "@nestjs/cqrs";

/** Status snapshot of a queued job. */
export interface JobStatus {
  readonly id: string;
  /** BullMQ state: waiting | active | completed | failed | delayed | unknown. */
  readonly state: string;
  /** The job result once completed, otherwise null. */
  readonly result: unknown;
  /** Failure reason when the job failed, otherwise null. */
  readonly failedReason: string | null;
}

/**
 * Read the status of a previously-enqueued job by id, on behalf of a caller.
 *
 * @remarks
 * `callerUserId` scopes the read to the caller's own jobs: a job owned by
 * another user resolves to `null` (rendered as 404) so its existence is not
 * leaked. Sourced from the authenticated context, never from client input.
 */
export class GetJobStatusQuery extends Query<JobStatus | null> {
  constructor(
    public readonly jobId: string,
    public readonly callerUserId: string,
  ) {
    super();
  }
}
