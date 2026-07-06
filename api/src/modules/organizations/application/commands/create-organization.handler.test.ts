import { beforeEach, describe, expect, it } from "vitest";
import { OrganizationSlugTakenError } from "../../domain/organization.errors.js";
import { InMemoryOrganizationRepository } from "../../testing/in-memory-organization.repository.js";
import { CreateOrganizationCommand } from "./create-organization.command.js";
import { CreateOrganizationHandler } from "./create-organization.handler.js";

describe("CreateOrganizationHandler", () => {
  let repo: InMemoryOrganizationRepository;
  let handler: CreateOrganizationHandler;

  beforeEach(() => {
    repo = new InMemoryOrganizationRepository();
    handler = new CreateOrganizationHandler(repo);
  });

  it("persists a new organization through the PORT and returns it", async () => {
    const org = await handler.execute(
      new CreateOrganizationCommand("acme", "Acme Inc"),
    );

    expect(org.slug).toBe("acme");
    expect(org.name).toBe("Acme Inc");
    expect(await repo.findById(org.id)).not.toBeNull();
  });

  it("rejects a duplicate slug before writing", async () => {
    await handler.execute(new CreateOrganizationCommand("acme", "Acme"));

    await expect(
      handler.execute(new CreateOrganizationCommand("acme", "Acme Two")),
    ).rejects.toBeInstanceOf(OrganizationSlugTakenError);

    // Only the first organization was stored — no partial write on conflict.
    const all = await repo.list();
    expect(all).toHaveLength(1);
  });
});
