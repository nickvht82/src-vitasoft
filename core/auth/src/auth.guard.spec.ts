import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { Auth } from "./auth.js";
import { AUTH_CONTEXT_KEY, type RequestWithAuth } from "./auth-context.js";
import { AuthGuard } from "./auth.guard.js";

const SESSION = {
  user: { id: "u1", email: "a@b.co", name: "Ada" },
  session: { id: "s1", activeOrganizationId: "org1" },
};

function fakeAuth(overrides: {
  getSession?: unknown;
  getActiveMemberRole?: unknown;
}): Auth {
  return {
    api: {
      getSession: vi.fn().mockResolvedValue(overrides.getSession ?? null),
      getActiveMemberRole: vi
        .fn()
        .mockResolvedValue(overrides.getActiveMemberRole ?? null),
    },
  } as unknown as Auth;
}

function contextFor(request: RequestWithAuth): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("AuthGuard", () => {
  it("rejects a request with no valid session", async () => {
    const guard = new AuthGuard(fakeAuth({ getSession: null }));
    const request: RequestWithAuth = { headers: {} };
    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("attaches the auth context (user, session, org, role) on success", async () => {
    const guard = new AuthGuard(
      fakeAuth({ getSession: SESSION, getActiveMemberRole: { role: "admin" } }),
    );
    const request: RequestWithAuth = {
      headers: { cookie: "better-auth.session_token=abc" },
    };

    const allowed = await guard.canActivate(contextFor(request));

    expect(allowed).toBe(true);
    const ctx = request[AUTH_CONTEXT_KEY];
    expect(ctx?.user).toEqual({ id: "u1", email: "a@b.co", name: "Ada" });
    expect(ctx?.sessionId).toBe("s1");
    expect(ctx?.organizationId).toBe("org1");
    expect(ctx?.role).toBe("admin");
  });

  it("joins array-valued headers when building the web Headers", async () => {
    const auth = fakeAuth({ getSession: SESSION });
    const guard = new AuthGuard(auth);
    const request: RequestWithAuth = {
      headers: { "x-forwarded-for": ["1.1.1.1", "2.2.2.2"], skip: undefined },
    };

    await guard.canActivate(contextFor(request));

    const passed = (auth.api.getSession as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { headers: Headers };
    expect(passed.headers.get("x-forwarded-for")).toBe("1.1.1.1, 2.2.2.2");
    expect(passed.headers.has("skip")).toBe(false);
  });

  it("leaves role undefined when the member-role lookup returns a non-role", async () => {
    const guard = new AuthGuard(
      fakeAuth({ getSession: SESSION, getActiveMemberRole: { role: "owner" } }),
    );
    const request: RequestWithAuth = { headers: {} };
    await guard.canActivate(contextFor(request));
    expect(request[AUTH_CONTEXT_KEY]?.role).toBeUndefined();
  });

  it("swallows errors from the member-role lookup (user not in an org)", async () => {
    const auth = {
      api: {
        getSession: vi.fn().mockResolvedValue(SESSION),
        getActiveMemberRole: vi.fn().mockRejectedValue(new Error("no org")),
      },
    } as unknown as Auth;
    const guard = new AuthGuard(auth);
    const request: RequestWithAuth = { headers: {} };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request[AUTH_CONTEXT_KEY]?.role).toBeUndefined();
  });

  it("defaults name to empty string when the user has none", async () => {
    const guard = new AuthGuard(
      fakeAuth({
        getSession: {
          user: { id: "u2", email: "x@y.z", name: null },
          session: { id: "s2", activeOrganizationId: null },
        },
      }),
    );
    const request: RequestWithAuth = { headers: {} };
    await guard.canActivate(contextFor(request));
    expect(request[AUTH_CONTEXT_KEY]?.user.name).toBe("");
    expect(request[AUTH_CONTEXT_KEY]?.organizationId).toBeUndefined();
  });
});
