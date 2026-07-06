import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../../infrastructure/database/prisma.service.js";
import { Organization } from "../domain/organization.entity.js";
import { PrismaOrganizationRepository } from "./prisma-organization.repository.js";

const ROW = {
  id: "org-1",
  slug: "acme",
  name: "Acme",
  createdAt: new Date("2026-07-06T00:00:00.000Z"),
};

function fakePrisma(overrides: Record<string, unknown>): PrismaService {
  return {
    client: { organization: overrides },
  } as unknown as PrismaService;
}

describe("PrismaOrganizationRepository", () => {
  it("create maps the persisted row to a domain entity", async () => {
    const create = vi.fn().mockResolvedValue(ROW);
    const repo = new PrismaOrganizationRepository(fakePrisma({ create }));

    const org = await repo.create({ slug: "acme", name: "Acme" });

    expect(create).toHaveBeenCalledWith({
      data: { slug: "acme", name: "Acme" },
    });
    expect(org).toBeInstanceOf(Organization);
    expect(org.id).toBe("org-1");
  });

  it("findById returns a domain entity or null", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce(ROW)
      .mockResolvedValueOnce(null);
    const repo = new PrismaOrganizationRepository(fakePrisma({ findUnique }));

    expect(await repo.findById("org-1")).toBeInstanceOf(Organization);
    expect(await repo.findById("missing")).toBeNull();
  });

  it("existsBySlug reflects the count", async () => {
    const count = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const repo = new PrismaOrganizationRepository(fakePrisma({ count }));

    expect(await repo.existsBySlug("acme")).toBe(true);
    expect(await repo.existsBySlug("nope")).toBe(false);
  });

  it("list maps every row and orders newest first", async () => {
    const findMany = vi.fn().mockResolvedValue([ROW]);
    const repo = new PrismaOrganizationRepository(fakePrisma({ findMany }));

    const all = await repo.list();

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(all[0]).toBeInstanceOf(Organization);
  });
});
