import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  AiTasksQueue,
  ECHO_JOB,
} from "../ai-tasks.queue.js";
import { EnqueueEchoCommand } from "./enqueue-echo.command.js";

/**
 * Adds an `echo` job to the `ai-tasks` queue and returns its id so the caller
 * can poll status. The API responds immediately — the worker processes the job
 * asynchronously (ARCHITECTURE.md §6.2).
 */
@CommandHandler(EnqueueEchoCommand)
export class EnqueueEchoHandler
  implements ICommandHandler<EnqueueEchoCommand, { jobId: string }>
{
  constructor(private readonly aiTasks: AiTasksQueue) {}

  async execute(command: EnqueueEchoCommand): Promise<{ jobId: string }> {
    const job = await this.aiTasks.queue.add(ECHO_JOB, {
      text: command.text,
      ownerUserId: command.ownerUserId,
      ownerOrganizationId: command.ownerOrganizationId,
    });
    // BullMQ always assigns an id on add; the fallback keeps the type total.
    return { jobId: job.id ?? "" };
  }
}
