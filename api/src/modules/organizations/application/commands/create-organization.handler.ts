import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import type { Organization } from "../../domain/organization.entity.js";
import { OrganizationSlugTakenError } from "../../domain/organization.errors.js";
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from "../../domain/organization.repository.js";
import { CreateOrganizationCommand } from "./create-organization.command.js";

/**
 * Handles {@link CreateOrganizationCommand}: enforces slug uniqueness, then
 * persists via the repository PORT. Depends only on the domain — it never sees
 * Prisma or HTTP, which is exactly what makes it unit-testable with a fake repo.
 */
@CommandHandler(CreateOrganizationCommand)
export class CreateOrganizationHandler
  implements ICommandHandler<CreateOrganizationCommand, Organization>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepository,
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<Organization> {
    if (await this.organizations.existsBySlug(command.slug)) {
      throw new OrganizationSlugTakenError(command.slug);
    }
    return this.organizations.create({
      slug: command.slug,
      name: command.name,
    });
  }
}
