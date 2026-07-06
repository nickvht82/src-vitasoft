import { Module } from "@nestjs/common";
import { DatabaseModule } from "./infrastructure/database/database.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { OrganizationsModule } from "./modules/organizations/organizations.module.js";

/**
 * Root module. Composes the global infrastructure (database) with feature
 * modules. New product modules are added here — the modular-monolith seam.
 */
@Module({
  imports: [DatabaseModule, HealthModule, OrganizationsModule],
})
export class AppModule {}
