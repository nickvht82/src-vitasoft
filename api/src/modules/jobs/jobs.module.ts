import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { AiTasksQueue } from "./ai-tasks.queue.js";
import { EnqueueEchoHandler } from "./application/enqueue-echo.handler.js";
import { GetJobStatusHandler } from "./application/get-job-status.handler.js";
import { JobsController } from "./presentation/jobs.controller.js";

/**
 * Jobs feature module. Owns the `ai-tasks` queue + in-process worker and wires
 * the CQRS handlers that enqueue/read echo jobs. A demonstration of the
 * produce→consume flow (no AI yet).
 */
@Module({
  imports: [CqrsModule],
  controllers: [JobsController],
  providers: [AiTasksQueue, EnqueueEchoHandler, GetJobStatusHandler],
})
export class JobsModule {}
