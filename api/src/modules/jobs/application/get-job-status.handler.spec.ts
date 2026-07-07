import { describe, expect, it, vi } from "vitest";
import type { AiTasksQueue } from "../ai-tasks.queue.js";
import { GetJobStatusHandler } from "./get-job-status.handler.js";
import { GetJobStatusQuery } from "./get-job-status.query.js";

function fakeQueue(getJob: unknown): AiTasksQueue {
  return {
    queue: { getJob: vi.fn().mockResolvedValue(getJob) },
  } as unknown as AiTasksQueue;
}

/** A completed job owned by `ownerUserId`. */
function ownedJob(ownerUserId: string) {
  return {
    id: "job-1",
    data: { text: "hi", ownerUserId },
    getState: vi.fn().mockResolvedValue("completed"),
    returnvalue: { echoed: "hi", processedAt: "2026-07-06T00:00:00.000Z" },
    failedReason: undefined,
  };
}

describe("GetJobStatusHandler", () => {
  it("returns null for an unknown job id", async () => {
    const handler = new GetJobStatusHandler(fakeQueue(null));
    expect(
      await handler.execute(new GetJobStatusQuery("missing", "alice")),
    ).toBeNull();
  });

  it("returns null when the job belongs to another user (IDOR defense)", async () => {
    const handler = new GetJobStatusHandler(fakeQueue(ownedJob("alice")));
    // Bob asks for Alice's job — indistinguishable from not-found.
    expect(
      await handler.execute(new GetJobStatusQuery("job-1", "bob")),
    ).toBeNull();
  });

  it("maps a completed job to a status snapshot for its owner", async () => {
    const handler = new GetJobStatusHandler(fakeQueue(ownedJob("alice")));

    const status = await handler.execute(
      new GetJobStatusQuery("job-1", "alice"),
    );

    expect(status).toEqual({
      id: "job-1",
      state: "completed",
      result: { echoed: "hi", processedAt: "2026-07-06T00:00:00.000Z" },
      failedReason: null,
    });
  });

  it("surfaces the failure reason for a failed job owned by the caller", async () => {
    const job = {
      id: "job-2",
      data: { text: "boom-input", ownerUserId: "alice" },
      getState: vi.fn().mockResolvedValue("failed"),
      returnvalue: undefined,
      failedReason: "boom",
    };
    const handler = new GetJobStatusHandler(fakeQueue(job));

    const status = await handler.execute(
      new GetJobStatusQuery("job-2", "alice"),
    );

    expect(status?.state).toBe("failed");
    expect(status?.failedReason).toBe("boom");
    expect(status?.result).toBeNull();
  });

  it("falls back to the query id when the job carries none", async () => {
    const job = {
      id: undefined,
      data: { text: "hi", ownerUserId: "alice" },
      getState: vi.fn().mockResolvedValue("waiting"),
      returnvalue: undefined,
      failedReason: undefined,
    };
    const handler = new GetJobStatusHandler(fakeQueue(job));
    const status = await handler.execute(new GetJobStatusQuery("q-id", "alice"));
    expect(status?.id).toBe("q-id");
  });
});
