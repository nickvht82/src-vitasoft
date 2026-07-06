import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import type { Organization } from "../../domain/organization.entity.js";
import { OrganizationNotFoundError } from "../../domain/organization.errors.js";
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from "../../domain/organization.repository.js";
import { GetOrganizationQuery } from "./get-organization.query.js";

/**
 * Handles {@link GetOrganizationQuery}: returns the entity or raises
 * {@link OrganizationNotFoundError} (mapped to 404 at the boundary).
 */
@QueryHandler(GetOrganizationQuery)
export class GetOrganizationHandler
  implements IQueryHandler<GetOrganizationQuery, Organization>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepository,
  ) {}

  async execute(query: GetOrganizationQuery): Promise<Organization> {
    const organization = await this.organizations.findById(query.id);
    if (!organization) {
      throw new OrganizationNotFoundError(query.id);
    }
    return organization;
  }
}
