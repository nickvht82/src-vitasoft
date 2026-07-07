import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ClsModule } from "nestjs-cls";
import { DatabaseModule } from "./infrastructure/database/database.module.js";
import { TenantContextInterceptor } from "./infrastructure/tenant/tenant-context.interceptor.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { JobsModule } from "./modules/jobs/jobs.module.js";
import { OrganizationsModule } from "./modules/organizations/organizations.module.js";

/**
 * Root module. Composes the global infrastructure (CLS, database, auth) with
 * feature modules. New product modules are added here — the modular-monolith
 * seam.
 *
 * @remarks
 * `ClsModule` establishes an AsyncLocalStorage context per request (middleware
 * mounted on every route); {@link TenantContextInterceptor} then seeds the active
 * tenant into it so the Prisma tenant-scope extension can read it without any
 * layer threading `organizationId` through the domain.
 */
@Module({
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    OrganizationsModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
