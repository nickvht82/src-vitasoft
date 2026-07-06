import { beforeEach, describe, expect, it } from "vitest";
import { OrganizationNotFoundError } from "../../domain/organization.errors.js";
import { InMemoryOrganizationRepository } from "../../testing/in-memory-organization.repository.js";
import { GetOrganizationHandler } from "./get-organization.handler.js";
import { GetOrganizationQuery } from "./get-organization.query.js";
import { ListOrganizationsHandler } from "./list-organizations.handler.js";
import { ListOrganizationsQuery } from "./list-organizations.query.js";

describe("Organization query handlers", () => {
  let repo: InMemoryOrganizationRepository;

  beforeEach(() => {
    repo = new InMemoryOrganizationRepository();
  });

  describe("GetOrganizationHandler", () => {
    it("returns the organization when it exists", async () => {
      const created = await repo.create({ slug: "acme", name: "Acme" });
      const handler = new GetOrganizationHandler(repo);

      const found = await handler.execute(new GetOrganizationQuery(created.id));

      expect(found.id).toBe(created.id);
    });

    it("throws OrganizationNotFoundError for an unknown id", async () => {
      const handler = new GetOrganizationHandler(repo);

      await expect(
        handler.execute(new GetOrganizationQuery("missing")),
      ).rejects.toBeInstanceOf(OrganizationNotFoundError);
    });
  });

  describe("ListOrganizationsHandler", () => {
    it("returns organizations newest first", async () => {
      await repo.create({ slug: "first", name: "First" });
      await new Promise((r) => setTimeout(r, 2));
      await repo.create({ slug: "second", name: "Second" });
      const handler = new ListOrganizationsHandler(repo);

      const all = await handler.execute(new ListOrganizationsQuery());

      expect(all.map((o) => o.slug)).toEqual(["second", "first"]);
    });

    it("returns an empty array when there are none", async () => {
      const handler = new ListOrganizationsHandler(repo);
      expect(await handler.execute(new ListOrganizationsQuery())).toEqual([]);
    });
  });
});
