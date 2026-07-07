import type { AuthContext } from "@vitasoft/auth";
import { describe, expect, it } from "vitest";
import { MeController } from "./me.controller.js";

const controller = new MeController();

describe("MeController", () => {
  it("returns user, organization, and role for a member of an org", () => {
    const ctx: AuthContext = {
      user: { id: "u1", email: "a@b.co", name: "Ada" },
      sessionId: "s1",
      organizationId: "org-1",
      role: "admin",
    };
    expect(controller.me(ctx)).toEqual({
      user: ctx.user,
      organizationId: "org-1",
      role: "admin",
    });
  });

  it("returns nulls for org and role when the user is not in an organization", () => {
    const ctx: AuthContext = {
      user: { id: "u2", email: "x@y.z", name: "Bo" },
      sessionId: "s2",
    };
    expect(controller.me(ctx)).toEqual({
      user: ctx.user,
      organizationId: null,
      role: null,
    });
  });
});
