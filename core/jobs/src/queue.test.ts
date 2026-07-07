import { describe, expect, it, vi } from "vitest";

// Mock BullMQ so no real Redis connection is opened during unit tests; capture
// the constructor args to assert the connection is wired correctly.
const queueCtor = vi.fn();
const workerCtor = vi.fn();
vi.mock("bullmq", () => ({
  Queue: class {
    constructor(...args: unknown[]) {
      queueCtor(...args);
    }
  },
  Worker: class {
    constructor(...args: unknown[]) {
      workerCtor(...args);
    }
  },
}));

const { createQueue, createWorker } = await import("./queue.js");

describe("createQueue", () => {
  it("builds a queue with a connection parsed from redisUrl", () => {
    createQueue("ai-tasks", { redisUrl: "redis://localhost:6379" });
    const [name, opts] = queueCtor.mock.calls.at(-1) as [
      string,
      { connection: Record<string, unknown> },
    ];
    expect(name).toBe("ai-tasks");
    expect(opts.connection.host).toBe("localhost");
    expect(opts.connection.maxRetriesPerRequest).toBeNull();
  });

  it("uses an explicit connection over redisUrl", () => {
    const connection = { host: "explicit", port: 1234 } as never;
    createQueue("q", { connection, redisUrl: "redis://ignored:6379" });
    const [, opts] = queueCtor.mock.calls.at(-1) as [
      string,
      { connection: Record<string, unknown> },
    ];
    expect(opts.connection.host).toBe("explicit");
  });

  it("throws when neither redisUrl nor connection is supplied", () => {
    expect(() => createQueue("q", {})).toThrow(
      /requires either `redisUrl` or `connection`/,
    );
  });
});

describe("createWorker", () => {
  it("builds a worker with the processor and parsed connection", () => {
    const processor = vi.fn();
    createWorker("ai-tasks", processor, {
      redisUrl: "redis://localhost:6379",
      concurrency: 5,
    });
    const [name, passedProcessor, opts] = workerCtor.mock.calls.at(-1) as [
      string,
      unknown,
      { connection: Record<string, unknown>; concurrency?: number },
    ];
    expect(name).toBe("ai-tasks");
    expect(passedProcessor).toBe(processor);
    expect(opts.connection.host).toBe("localhost");
    // Worker-specific options pass through, connection keys are stripped.
    expect(opts.concurrency).toBe(5);
    expect(opts).not.toHaveProperty("redisUrl");
  });

  it("throws when no connection source is provided", () => {
    expect(() => createWorker("q", vi.fn(), {})).toThrow(
      /requires either `redisUrl` or `connection`/,
    );
  });
});
