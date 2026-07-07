import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { AUTH_CONTEXT_KEY, type AuthContext } from "./auth-context.js";
import { RolesGuard } from "./roles.guard.js";
import type { Role } from "./roles.js";

function contextFor(
  required: Role | undefined,
  authContext?: Partial<AuthContext>,
): ExecutionContext {
  const request: Record<string, unknown> = {};
  if (authContext) request[AUTH_CONTEXT_KEY] = authContext;
  return {
    getHandler: () => ({ __required: required }),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// A reflector that returns whatever we stashed on the handler stub.
class StubReflector extends Reflector {
  override getAllAndOverride<T>(_key: string, targets: unknown[]): T {
    const handler = targets[0] as { __required?: unknown };
    return handler.__required as T;
  }
}

function makeGuard(): RolesGuard {
  return new RolesGuard(new StubReflector());
}

describe("RolesGuard", () => {
  it("allows routes with no @Roles() requirement", () => {
    expect(makeGuard().canActivate(contextFor(undefined))).toBe(true);
  });

  it("allows when the caller's role meets the requirement", () => {
    const ctx = contextFor("operator", { role: "admin" });
    expect(makeGuard().canActivate(ctx)).toBe(true);
  });

  it("forbids when the caller's role is insufficient", () => {
    const ctx = contextFor("admin", { role: "member" });
    expect(() => makeGuard().canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("forbids when the caller has no role (not in an organization)", () => {
    const ctx = contextFor("member", { role: undefined });
    expect(() => makeGuard().canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("forbids when there is no auth context at all", () => {
    const ctx = contextFor("member");
    expect(() => makeGuard().canActivate(ctx)).toThrow(ForbiddenException);
  });
});
