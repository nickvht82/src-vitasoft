import { describe, expect, it } from "vitest";
import { CurrentUser } from "./current-user.decorator.js";

describe("CurrentUser", () => {
  it("is exported as a param decorator function", () => {
    // The extraction factory is a thin Nest wrapper (exercised end-to-end by the
    // api /v1/auth/me integration + smoke tests); here we assert the public shape.
    expect(typeof CurrentUser).toBe("function");
  });
});
