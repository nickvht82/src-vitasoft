import { Command } from "@nestjs/cqrs";

/**
 * Enqueue an `echo` job onto the `ai-tasks` queue on behalf of a specific owner.
 * Carries the id of the enqueued job in its result type.
 *
 * @remarks
 * `ownerUserId` / `ownerOrganizationId` come from the authenticated request (not
 * from client input) and are persisted on the job so status reads can enforce
 * ownership.
 */
export class EnqueueEchoCommand extends Command<{ jobId: string }> {
  constructor(
    public readonly text: string,
    public readonly ownerUserId: string,
    public readonly ownerOrganizationId?: string,
  ) {
    super();
  }
}
