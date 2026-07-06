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

  it("falls back to process.env.DATABASE_URL when no url is passed", () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/env";
    try {
      const client = createPrismaClient();
      expect(typeof client.$connect).toBe("function");
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });

  it("tolerates a missing url (empty-string fallback) so codegen/boot never crash", () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const client = createPrismaClient({ log: ["query"] });
      expect(typeof client.$connect).toBe("function");
    } finally {
      if (previous !== undefined) process.env.DATABASE_URL = previous;
    }
  });
});

describe("getPrismaClient", () => {
  it("caches a single instance across calls (one connection pool per process)", () => {
    const first = getPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/db" });
    const second = getPrismaClient();
    expect(second).toBe(first);
  });

  it("ignores options passed after the singleton already exists", () => {
    const first = getPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/a" });
    const second = getPrismaClient({ datasourceUrl: "postgresql://u:p@localhost:5432/c" });
    expect(second).toBe(first);
  });
});
