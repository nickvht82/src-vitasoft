import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { type AuthContext, AuthGuard, CurrentUser } from "@vitasoft/auth";
import { ZodValidationPipe } from "@vitasoft/http-kit";
import { EnqueueEchoCommand } from "../application/enqueue-echo.command.js";
import {
  GetJobStatusQuery,
  type JobStatus,
} from "../application/get-job-status.query.js";
import {
  type EnqueueEchoDto,
  enqueueEchoSchema,
} from "./job.dto.js";

/**
 * HTTP boundary for background jobs. Both enqueue and status read are
 * auth-protected, and status reads are scoped to the job's owner — a caller can
 * only read jobs they enqueued. Depends only on the CQRS buses (never on the
 * queue directly).
 */
@ApiTags("jobs")
@Controller("jobs")
export class JobsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("echo")
  @HttpCode(202)
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiCreatedResponse({ description: "Job accepted; poll GET /v1/jobs/:id." })
  async enqueueEcho(
    // Bind the Zod pipe to the body param (not the whole method) so it does not
    // also run against the injected `@CurrentUser()` auth context.
    @Body(new ZodValidationPipe(enqueueEchoSchema)) body: EnqueueEchoDto,
    @CurrentUser() auth: AuthContext,
  ): Promise<{ jobId: string }> {
    return this.commandBus.execute<EnqueueEchoCommand, { jobId: string }>(
      new EnqueueEchoCommand(body.text, auth.user.id, auth.organizationId),
    );
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ description: "The job's current status." })
  async getStatus(
    @Param("id") id: string,
    @CurrentUser() auth: AuthContext,
  ): Promise<JobStatus> {
    const status = await this.queryBus.execute<
      GetJobStatusQuery,
      JobStatus | null
    >(new GetJobStatusQuery(id, auth.user.id));
    if (!status) {
      // Unknown job *or* a job owned by another user — both are 404 so we do not
      // leak existence to a non-owner (IDOR defense).
      throw new NotFoundException(`Job "${id}" not found.`);
    }
    return status;
  }
}
