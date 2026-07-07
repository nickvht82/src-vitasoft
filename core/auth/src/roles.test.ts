import { describe, expect, it } from "vitest";
import { isRole, ROLES, roleAtLeast } from "./roles.js";

describe("roleAtLeast", () => {
  it("grants when the actual role outranks the requirement", () => {
    expect(roleAtLeast(ROLES.ADMIN, ROLES.OPERATOR)).toBe(true);
    expect(roleAtLeast(ROLES.ADMIN, ROLES.MEMBER)).toBe(true);
    expect(roleAtLeast(ROLES.OPERATOR, ROLES.MEMBER)).toBe(true);
  });

  it("grants when the actual role equals the requirement", () => {
    expect(roleAtLeast(ROLES.ADMIN, ROLES.ADMIN)).toBe(true);
    expect(roleAtLeast(ROLES.MEMBER, ROLES.MEMBER)).toBe(true);
  });

  it("denies when the actual role is below the requirement", () => {
    expect(roleAtLeast(ROLES.MEMBER, ROLES.OPERATOR)).toBe(false);
    expect(roleAtLeast(ROLES.OPERATOR, ROLES.ADMIN)).toBe(false);
    expect(roleAtLeast(ROLES.MEMBER, ROLES.ADMIN)).toBe(false);
  });

  it("denies unknown roles rather than throwing", () => {
    expect(roleAtLeast("superadmin", ROLES.MEMBER)).toBe(false);
    expect(roleAtLeast("", ROLES.MEMBER)).toBe(false);
  });
});

describe("isRole", () => {
  it("recognises the three defined roles", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("operator")).toBe(true);
    expect(isRole("member")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isRole("owner")).toBe(false);
    expect(isRole("")).toBe(false);
  });
});
