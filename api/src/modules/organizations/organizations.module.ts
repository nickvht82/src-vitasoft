import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { CreateOrganizationHandler } from "./application/commands/create-organization.handler.js";
import { GetOrganizationHandler } from "./application/queries/get-organization.handler.js";
import { ListOrganizationsHandler } from "./application/queries/list-organizations.handler.js";
import { ORGANIZATION_REPOSITORY } from "./domain/organization.repository.js";
import { PrismaOrganizationRepository } from "./infrastructure/prisma-organization.repository.js";
import { OrganizationsController } from "./presentation/organizations.controller.js";

const commandHandlers = [CreateOrganizationHandler];
const queryHandlers = [GetOrganizationHandler, ListOrganizationsHandler];

/**
 * Organizations feature module. Wires the four Clean Architecture layers:
 * the controller (presentation) drives CQRS handlers (application), which depend
 * on the repository PORT bound here to its Prisma ADAPTER (infrastructure).
 */
@Module({
  imports: [CqrsModule],
  controllers: [OrganizationsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    // Bind the domain PORT to its infrastructure ADAPTER — the DI seam that lets
    // handlers be tested against an in-memory fake.
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: PrismaOrganizationRepository,
    },
  ],
})
export class OrganizationsModule {}
