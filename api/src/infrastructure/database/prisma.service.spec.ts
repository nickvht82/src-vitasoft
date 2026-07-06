import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "./prisma.service.js";

describe("PrismaService", () => {
  it("ping returns true when the query succeeds", async () => {
    const service = new PrismaService();
    vi.spyOn(service.client, "$queryRaw").mockResolvedValue([{ "?column?": 1 }]);
    expect(await service.ping()).toBe(true);
  });

  it("ping returns false (degrades gracefully) when the DB is unreachable", async () => {
    const service = new PrismaService();
    vi.spyOn(service.client, "$queryRaw").mockRejectedValue(
      new Error("ECONNREFUSED"),
    );
    expect(await service.ping()).toBe(false);
  });

  it("disconnects the client on module destroy", async () => {
    const service = new PrismaService();
    const disconnect = vi
      .spyOn(service.client, "$disconnect")
      .mockResolvedValue();
    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
