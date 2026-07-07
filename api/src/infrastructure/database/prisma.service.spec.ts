import { getPrismaClient } from "@vitasoft/database";
import type { ClsService } from "nestjs-cls";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaService } from "./prisma.service.js";

const TEST_DATABASE_URL = "postgresql://u:p@localhost:5432/test";

/** Minimal ClsService stub — returns a fixed tenant id (or none). */
function fakeCls(tenantId?: string): ClsService {
  return {
    get: vi.fn().mockReturnValue(tenantId),
    isActive: vi.fn().mockReturnValue(true),
  } as unknown as ClsService;
}

describe("PrismaService", () => {
  let previousUrl: string | undefined;

  beforeAll(() => {
    // The service now fails fast when DATABASE_URL is missing (F-01); provide a
    // syntactically-valid url so the constructor can build the lazy client.
    previousUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = TEST_DATABASE_URL;
  });

  afterAll(() => {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  it("ping returns true when the query succeeds", async () => {
    const service = new PrismaService(fakeCls());
    // ping goes through the base client (raw query, intentionally unscoped).
    const base = getPrismaClient({ datasourceUrl: TEST_DATABASE_URL });
    vi.spyOn(base, "$queryRaw").mockResolvedValue([{ "?column?": 1 }]);
    expect(await service.ping()).toBe(true);
  });

  it("ping returns false (degrades gracefully) when the DB is unreachable", async () => {
    const service = new PrismaService(fakeCls());
    const base = getPrismaClient({ datasourceUrl: TEST_DATABASE_URL });
    vi.spyOn(base, "$queryRaw").mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await service.ping()).toBe(false);
  });

  it("disconnects the base client on module destroy", async () => {
    const service = new PrismaService(fakeCls());
    const base = getPrismaClient({ datasourceUrl: TEST_DATABASE_URL });
    const disconnect = vi.spyOn(base, "$disconnect").mockResolvedValue();
    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("exposes a tenant-scoped client wired to CLS", () => {
    const cls = fakeCls("org-42");
    const service = new PrismaService(cls);
    // The extended client is distinct from the base and carries model accessors.
    expect(service.client).toBeDefined();
    expect(typeof service.client.user.findMany).toBe("function");
  });

  it("exposes the un-scoped base client for cross-tenant infrastructure (auth)", () => {
    const service = new PrismaService(fakeCls("org-42"));
    // The base client has the full PrismaClient surface (e.g. $queryRaw).
    expect(typeof service.unscoped.$queryRaw).toBe("function");
  });

  it("fails fast when DATABASE_URL is missing (F-01)", async () => {
    // Reset both the config cache and the prisma singleton so construction
    // re-reads the (now cleared) environment.
    vi.resetModules();
    const savedUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete (globalThis as Record<symbol, unknown>)[
      Symbol.for("vitasoft.prisma.client")
    ];
    try {
      const configModule = await import("@vitasoft/config");
      // Clear the module-level cache in @vitasoft/config so loadEnv re-parses.
      configModule.loadEnv({ NODE_ENV: "test" }); // primes with override, does not cache
      const { PrismaService: FreshService } = await import(
        "./prisma.service.js"
      );
      expect(() => new FreshService(fakeCls())).toThrow(
        /DATABASE_URL is required/,
      );
    } finally {
      if (savedUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedUrl;
    }
  });
});
