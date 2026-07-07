import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import { Organization } from "../domain/organization.entity.js";
import { OrganizationSlugTakenError } from "../domain/organization.errors.js";
import type {
  NewOrganization,
  OrganizationRepository,
} from "../domain/organization.repository.js";

interface OrganizationRow {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
}

/** Prisma error code for a unique-constraint violation. */
const PRISMA_UNIQUE_VIOLATION = "P2002";

/**
 * Narrow an unknown error to a Prisma unique-constraint violation without
 * importing Prisma's error classes (they are not part of our public surface).
 * A structural check on the `code` field is enough and keeps the adapter light.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
  );
}

/**
 * Prisma ADAPTER implementing the {@link OrganizationRepository} PORT.
 *
 * This is the only place that knows about Prisma for organizations. It maps
 * persistence rows to domain entities so the domain stays free of ORM types.
 */
@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: NewOrganization): Promise<Organization> {
    try {
      const row = await this.prisma.client.organization.create({
        data: { slug: input.slug, name: input.name },
      });
      return PrismaOrganizationRepository.toDomain(row);
    } catch (error) {
      // The handler checks `existsBySlug` first, but that read-then-write is a
      // TOCTOU race: two concurrent creates with the same slug both pass the
      // check, and the DB unique index rejects the loser with P2002. Translate
      // that into the domain error so the controller returns 409, not 500
      // (QA finding F-02). The DB constraint remains the real guarantee.
      if (isUniqueViolation(error)) {
        throw new OrganizationSlugTakenError(input.slug);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Organization | null> {
    const row = await this.prisma.client.organization.findUnique({
      where: { id },
    });
    return row ? PrismaOrganizationRepository.toDomain(row) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.client.organization.count({
      where: { slug },
    });
    return count > 0;
  }

  async list(): Promise<Organization[]> {
    const rows = await this.prisma.client.organization.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(PrismaOrganizationRepository.toDomain);
  }

  /** Map a persistence row to a domain entity. Static + pure — trivially testable. */
  private static toDomain(row: OrganizationRow): Organization {
    return Organization.fromPersistence({
      id: row.id,
      slug: row.slug,
      name: row.name,
      createdAt: row.createdAt,
    });
  }
}
