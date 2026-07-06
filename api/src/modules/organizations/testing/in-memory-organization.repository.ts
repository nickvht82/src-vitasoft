import { randomUUID } from "node:crypto";
import { Organization } from "../domain/organization.entity.js";
import type {
  NewOrganization,
  OrganizationRepository,
} from "../domain/organization.repository.js";

/**
 * In-memory {@link OrganizationRepository} for tests. Its existence is the point
 * of Ports & Adapters: handlers and the controller run against this fake with no
 * database, proving they depend on the PORT and not on Prisma.
 */
export class InMemoryOrganizationRepository implements OrganizationRepository {
  private readonly store = new Map<string, Organization>();

  create(input: NewOrganization): Promise<Organization> {
    const organization = Organization.fromPersistence({
      id: randomUUID(),
      slug: input.slug,
      name: input.name,
      createdAt: new Date(),
    });
    this.store.set(organization.id, organization);
    return Promise.resolve(organization);
  }

  findById(id: string): Promise<Organization | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  existsBySlug(slug: string): Promise<boolean> {
    for (const org of this.store.values()) {
      if (org.slug === slug) return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  list(): Promise<Organization[]> {
    const all = [...this.store.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return Promise.resolve(all);
  }
}
