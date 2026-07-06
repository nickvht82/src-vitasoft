import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import { Organization } from "../domain/organization.entity.js";
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
    const row = await this.prisma.client.organization.create({
      data: { slug: input.slug, name: input.name },
    });
    return PrismaOrganizationRepository.toDomain(row);
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
