import { describe, expect, it } from "vitest";
import { Organization } from "./organization.entity.js";

describe("Organization entity", () => {
  it("rehydrates from persistence with readonly fields", () => {
    const createdAt = new Date("2026-07-06T00:00:00.000Z");
    const org = Organization.fromPersistence({
      id: "org-1",
      slug: "acme",
      name: "Acme",
      createdAt,
    });

    expect(org.id).toBe("org-1");
    expect(org.slug).toBe("acme");
    expect(org.name).toBe("Acme");
    expect(org.createdAt).toBe(createdAt);
  });
});
