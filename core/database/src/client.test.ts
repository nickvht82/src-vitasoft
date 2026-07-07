import { afterEach, describe, expect, it } from "vitest";
import { createPrismaClient, getPrismaClient } from "./index.js";

const SINGLETON_KEY = Symbol.for("vitasoft.prisma.client");

afterEach(() => {
  // Reset the cached singleton so each test starts from a clean process state.
  delete (globalThis as Record<symbol, unknown>)[SINGLETON_KEY];
});

describe("createPrismaClient", () => {
  it("constructs a usable client (exposes model accessors) without connecting", () => {
    const client = createPrismaClient({
      datasourceUrl: "postgresql://u:p@localhost:5432/db",
    });
    // Assert behavior (the client surface) rather than `instanceof` — the Prisma 7
    // client is a proxy, so a shape check is the meaningful assertion here.
    expect(typeof client.$connect).toBe("function");
    expect(typeof client.organization.findMany).toBe("function");
  });

  it("returns a distinct instance on every call", () => {
    const a = createPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/db" });
    const b = createPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/db" });
    expect(a).not.toBe(b);
  });

  it("does NOT read process.env — an unpassed url fails fast (F-01)", () => {
    // Even with a valid DATABASE_URL in the environment, the factory must not
    // reach into process.env: config validation is the single boundary.
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/env";
    try {
      expect(() =>
        createPrismaClient({ datasourceUrl: "" }),
      ).toThrow(/non-empty datasourceUrl/);
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });

  it("throws on an empty datasourceUrl instead of building a dead client (F-01)", () => {
    expect(() =>
      createPrismaClient({ datasourceUrl: "", log: ["query"] }),
    ).toThrow(/non-empty datasourceUrl/);
  });
});

describe("getPrismaClient", () => {
  it("caches a single instance across calls (one connection pool per process)", () => {
    const first = getPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/db" });
    const second = getPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/ignored" });
    expect(second).toBe(first);
  });

  it("ignores options passed after the singleton already exists", () => {
    const first = getPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/a" });
    const second = getPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/c" });
    expect(second).toBe(first);
  });
});
