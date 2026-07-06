import type {
  HealthCheckService,
  HealthIndicatorService,
} from "@nestjs/terminus";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../infrastructure/database/prisma.service.js";
import { HealthController } from "./health.controller.js";

function makeController(pingResult: boolean) {
  const prisma = { ping: vi.fn().mockResolvedValue(pingResult) };
  // Fake HealthIndicatorService: .check(key) returns a session whose up()/down()
  // produce terminus-shaped results we can assert on.
  const indicator = {
    check: (key: string) => ({
      up: () => ({ [key]: { status: "up" } }),
      down: () => ({ [key]: { status: "down" } }),
    }),
  };
  // Fake HealthCheckService: runs each indicator and aggregates the details.
  const health = {
    check: vi.fn(async (indicators: (() => Promise<unknown>)[]) => {
      const results = await Promise.all(indicators.map((fn) => fn()));
      return { details: Object.assign({}, ...results) };
    }),
  };
  const controller = new HealthController(
    health as unknown as HealthCheckService,
    indicator as unknown as HealthIndicatorService,
    prisma as unknown as PrismaService,
  );
  return { controller, health, prisma };
}

describe("HealthController", () => {
  it("live runs no indicators (never touches the DB)", async () => {
    const { controller, health, prisma } = makeController(true);
    await controller.live();
    expect(health.check).toHaveBeenCalledWith([]);
    expect(prisma.ping).not.toHaveBeenCalled();
  });

  it("ready reports database up when Postgres is reachable", async () => {
    const { controller } = makeController(true);
    const result = (await controller.ready()) as {
      details: { database: { status: string } };
    };
    expect(result.details.database.status).toBe("up");
  });

  it("ready reports database down (degrades gracefully) when unreachable", async () => {
    const { controller } = makeController(false);
    const result = (await controller.ready()) as {
      details: { database: { status: string } };
    };
    expect(result.details.database.status).toBe("down");
  });
});
