import { z } from "zod";
import type { Organization } from "../domain/organization.entity.js";

/**
 * Request body schema for creating an organization. Validated at the boundary
 * by `ZodValidationPipe` — the handler receives already-typed, trusted input.
 */
export const createOrganizationSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "slug must be lowercase alphanumeric words separated by hyphens",
    ),
  name: z.string().min(1).max(200),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;

/** Wire representation of an organization returned by the API. */
export interface OrganizationResponse {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly createdAt: string;
}

/** Map a domain entity to its JSON wire shape (ISO timestamp). */
export function toOrganizationResponse(
  organization: Organization,
): OrganizationResponse {
  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    createdAt: organization.createdAt.toISOString(),
  };
}
