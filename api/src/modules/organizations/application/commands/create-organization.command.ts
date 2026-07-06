import { Command } from "@nestjs/cqrs";
import type { Organization } from "../../domain/organization.entity.js";

/**
 * Intent to create a new organization. Carries only the business input; the id
 * and timestamp are assigned by persistence. Typed via CQRS `Command<T>` so the
 * `CommandBus` infers the returned {@link Organization}.
 */
export class CreateOrganizationCommand extends Command<Organization> {
  constructor(
    public readonly slug: string,
    public readonly name: string,
  ) {
    super();
  }
}
