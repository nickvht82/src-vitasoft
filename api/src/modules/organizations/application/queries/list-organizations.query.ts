import { Query } from "@nestjs/cqrs";
import type { Organization } from "../../domain/organization.entity.js";

/**
 * List all organizations, newest first. Typed via CQRS `Query<T>` so the
 * `QueryBus` infers the returned array.
 */
export class ListOrganizationsQuery extends Query<Organization[]> {}
