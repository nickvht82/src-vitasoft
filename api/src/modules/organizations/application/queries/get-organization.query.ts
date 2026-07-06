import { Query } from "@nestjs/cqrs";
import type { Organization } from "../../domain/organization.entity.js";

/**
 * Fetch a single organization by id. Typed via CQRS `Query<T>` so the `QueryBus`
 * infers the returned {@link Organization}.
 */
export class GetOrganizationQuery extends Query<Organization> {
  constructor(public readonly id: string) {
    super();
  }
}
