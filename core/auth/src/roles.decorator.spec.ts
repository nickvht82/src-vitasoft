import { describe, expect, it } from "vitest";
import { Reflector } from "@nestjs/core";
import { Roles, ROLES_METADATA_KEY } from "./roles.decorator.js";

describe("Roles decorator", () => {
  it("attaches the required role as method metadata the Reflector can read", () => {
    class Controller {
      @Roles("admin")
      create(): void {}
    }

    const reflector = new Reflector();
    const role = reflector.get<string>(
      ROLES_METADATA_KEY,
      Controller.prototype.create,
    );
    expect(role).toBe("admin");
  });

  it("supports operator and member requirements", () => {
    class Controller {
      @Roles("operator")
      op(): void {}
      @Roles("member")
      view(): void {}
    }

    const reflector = new Reflector();
    expect(
      reflector.get(ROLES_METADATA_KEY, Controller.prototype.op),
    ).toBe("operator");
    expect(
      reflector.get(ROLES_METADATA_KEY, Controller.prototype.view),
    ).toBe("member");
  });
});
