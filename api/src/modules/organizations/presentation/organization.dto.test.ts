import { describe, expect, it } from "vitest";
import { Organization } from "../domain/organization.entity.js";
import {
  createOrganizationSchema,
  toOrganizationResponse,
} from "./organization.dto.js";

describe("createOrganizationSchema", () => {
  it("accepts a valid slug and name", () => {
    const parsed = createOrganizationSchema.parse({
      slug: "acme-corp",
      name: "Acme Corp",
    });
    expect(parsed).toEqual({ slug: "acme-corp", name: "Acme Corp" });
  });

  it.each([
    ["Acme", "uppercase not allowed"],
    ["-acme", "leading hyphen"],
    ["ac--me", "double hyphen"],
    ["", "empty"],
  ])("rejects invalid slug %s (%s)", (slug) => {
    const result = createOrganizationSchema.safeParse({ slug, name: "x" });
    expect(result.success).toBe(false);
  });
});

describe("toOrganizationResponse", () => {
  it("serializes createdAt to an ISO string", () => {
    const org = Organization.fromPersistence({
      id: "org-1",
      slug: "acme",
      name: "Acme",
      createdAt: new Date("2026-07-06T10:00:00.000Z"),
    });
    expect(toOrganizationResponse(org)).toEqual({
      id: "org-1",
      slug: "acme",
      name: "Acme",
      createdAt: "2026-07-06T10:00:00.000Z",
    });
  });
});
