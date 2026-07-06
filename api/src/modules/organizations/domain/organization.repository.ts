import type { Organization } from "./organization.entity.js";

/**
 * Data needed to persist a new organization. The `id` and `createdAt` are
 * assigned by the persistence layer, so the domain only supplies business input.
 */
export interface NewOrganization {
  readonly slug: string;
  readonly name: string;
}

/**
 * Repository PORT — the domain's outbound contract for organization persistence.
 *
 * The domain and application layers depend only on this interface; the concrete
 * Prisma adapter lives in `infrastructure/` and is bound to {@link ORGANIZATION_REPOSITORY}
 * by the NestJS container. This is the Dependency Inversion boundary that makes
 * handlers testable with an in-memory fake.
 */
export interface OrganizationRepository {
  /** Persist a new organization and return the stored entity. */
  create(input: NewOrganization): Promise<Organization>;
  /** Look up an organization by id, or `null` when it does not exist. */
  findById(id: string): Promise<Organization | null>;
  /** Return true when an organization with the given slug already exists. */
  existsBySlug(slug: string): Promise<boolean>;
  /** List organizations, newest first. */
  list(): Promise<Organization[]>;
}

/**
 * Injection token for {@link OrganizationRepository}. Interfaces vanish at
 * runtime, so DI needs a concrete token to bind the port to its adapter.
 */
export const ORGANIZATION_REPOSITORY = Symbol("OrganizationRepository");
