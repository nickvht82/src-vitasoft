import { describe, expect, it, vi } from "vitest";
import type { AiTasksQueue } from "../ai-tasks.queue.js";
import { ECHO_JOB } from "../ai-tasks.queue.js";
import { EnqueueEchoCommand } from "./enqueue-echo.command.js";
import { EnqueueEchoHandler } from "./enqueue-echo.handler.js";

function fakeQueue(addResult: { id?: string }): AiTasksQueue {
  return {
    queue: { add: vi.fn().mockResolvedValue(addResult) },
  } as unknown as AiTasksQueue;
}

describe("EnqueueEchoHandler", () => {
  it("adds an echo job persisting the owner and returns its id", async () => {
    const aiTasks = fakeQueue({ id: "job-1" });
    const handler = new EnqueueEchoHandler(aiTasks);

    const result = await handler.execute(
      new EnqueueEchoCommand("hi", "alice", "org-A"),
    );

    expect(aiTasks.queue.add).toHaveBeenCalledWith(ECHO_JOB, {
      text: "hi",
      ownerUserId: "alice",
      ownerOrganizationId: "org-A",
    });
    expect(result).toEqual({ jobId: "job-1" });
  });

  it("persists an undefined tenant when the owner is not in an organization", async () => {
    const aiTasks = fakeQueue({ id: "job-2" });
    const handler = new EnqueueEchoHandler(aiTasks);

    await handler.execute(new EnqueueEchoCommand("hi", "alice"));

    expect(aiTasks.queue.add).toHaveBeenCalledWith(ECHO_JOB, {
      text: "hi",
      ownerUserId: "alice",
      ownerOrganizationId: undefined,
    });
  });

  it("falls back to an empty id if BullMQ omits one (keeps the type total)", async () => {
    const handler = new EnqueueEchoHandler(fakeQueue({}));
    const result = await handler.execute(
      new EnqueueEchoCommand("x", "alice"),
    );
    expect(result).toEqual({ jobId: "" });
  });
});
