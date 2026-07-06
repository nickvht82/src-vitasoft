import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import type { Organization } from "../../domain/organization.entity.js";
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from "../../domain/organization.repository.js";
import { ListOrganizationsQuery } from "./list-organizations.query.js";

/**
 * Handles {@link ListOrganizationsQuery}: delegates straight to the repository
 * PORT. Kept trivial on purpose — no business rule beyond "read the list".
 */
@QueryHandler(ListOrganizationsQuery)
export class ListOrganizationsHandler
  implements IQueryHandler<ListOrganizationsQuery, Organization[]>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepository,
  ) {}

  execute(): Promise<Organization[]> {
    return this.organizations.list();
  }
}
