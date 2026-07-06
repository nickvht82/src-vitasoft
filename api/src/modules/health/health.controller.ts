import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  type HealthIndicatorResult,
  HealthIndicatorService,
} from "@nestjs/terminus";
import { PrismaService } from "../../infrastructure/database/prisma.service.js";

/**
 * Kubernetes liveness/readiness endpoints (see ARCHITECTURE.md §8).
 *
 * - `/health/live` — the process is up; never touches the DB so a DB outage
 *   does not trigger pod restarts.
 * - `/health/ready` — the process can serve traffic; checks Postgres connectivity
 *   and degrades gracefully (readiness reports `down` → 503, not a 500 crash)
 *   when the DB is absent.
 */
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("live")
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([() => this.checkDatabase()]);
  }

  /**
   * Readiness probe for Postgres. Returns a terminus `down` result (rendered as
   * 503) rather than throwing when the DB is unreachable — the API stays live
   * while Postgres comes up.
   */
  private async checkDatabase(): Promise<HealthIndicatorResult> {
    const session = this.indicator.check("database");
    const ok = await this.prisma.ping();
    return ok ? session.up() : session.down();
  }
}
