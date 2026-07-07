import { NotFoundException } from "@nestjs/common";
import type { AuthContext } from "@vitasoft/auth";
import { describe, expect, it, vi } from "vitest";
import { EnqueueEchoCommand } from "../application/enqueue-echo.command.js";
import type { JobStatus } from "../application/get-job-status.query.js";
import { GetJobStatusQuery } from "../application/get-job-status.query.js";
import { JobsController } from "./jobs.controller.js";

function makeController(overrides: {
  command?: unknown;
  query?: unknown;
}): {
  controller: JobsController;
  commandExecute: ReturnType<typeof vi.fn>;
  queryExecute: ReturnType<typeof vi.fn>;
} {
  const commandExecute = vi.fn().mockResolvedValue(overrides.command);
  const queryExecute = vi.fn().mockResolvedValue(overrides.query);
  const controller = new JobsController(
    { execute: commandExecute } as never,
    { execute: queryExecute } as never,
  );
  return { controller, commandExecute, queryExecute };
}

function authContext(overrides: Partial<AuthContext["user"]> = {}): AuthContext {
  return {
    user: { id: "alice", email: "alice@a.co", name: "Alice", ...overrides },
    sessionId: "sess-1",
    organizationId: "org-A",
  };
}

describe("JobsController", () => {
  it("enqueues an echo job carrying the caller as owner and returns the id", async () => {
    const { controller, commandExecute } = makeController({
      command: { jobId: "job-9" },
    });
    const result = await controller.enqueueEcho({ text: "hello" }, authContext());
    expect(result).toEqual({ jobId: "job-9" });
    // The owner id + tenant come from the auth context, not from the body.
    const command = commandExecute.mock.calls[0][0] as EnqueueEchoCommand;
    expect(command).toBeInstanceOf(EnqueueEchoCommand);
    expect(command.text).toBe("hello");
    expect(command.ownerUserId).toBe("alice");
    expect(command.ownerOrganizationId).toBe("org-A");
  });

  it("returns the job status when found and reads scoped to the caller", async () => {
    const status: JobStatus = {
      id: "job-9",
      state: "completed",
      result: { echoed: "hello" },
      failedReason: null,
    };
    const { controller, queryExecute } = makeController({ query: status });
    expect(await controller.getStatus("job-9", authContext())).toEqual(status);
    const query = queryExecute.mock.calls[0][0] as GetJobStatusQuery;
    expect(query).toBeInstanceOf(GetJobStatusQuery);
    expect(query.jobId).toBe("job-9");
    expect(query.callerUserId).toBe("alice");
  });

  it("maps a missing job to 404", async () => {
    const { controller } = makeController({ query: null });
    await expect(
      controller.getStatus("missing", authContext()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps another user's job to 404 (the handler returns null for a non-owner)", async () => {
    // The ownership check lives in the handler; from the controller's view a
    // non-owner is indistinguishable from a missing job (both 404).
    const { controller } = makeController({ query: null });
    await expect(
      controller.getStatus("job-owned-by-bob", authContext({ id: "alice" })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
