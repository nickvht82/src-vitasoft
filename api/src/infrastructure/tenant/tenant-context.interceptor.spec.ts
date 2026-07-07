import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { AUTH_CONTEXT_KEY, type AuthContext } from "@vitasoft/auth";
import type { ClsService } from "nestjs-cls";
import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { TENANT_ID_CLS_KEY, readTenantId } from "./tenant-context.js";
import { TenantContextInterceptor } from "./tenant-context.interceptor.js";

function fakeCls(active = true): ClsService & {
  set: ReturnType<typeof vi.fn>;
} {
  return {
    set: vi.fn(),
    isActive: vi.fn().mockReturnValue(active),
    get: vi.fn(),
  } as unknown as ClsService & { set: ReturnType<typeof vi.fn> };
}

function contextWith(authContext?: Partial<AuthContext>): ExecutionContext {
  const request: Record<string, unknown> = {};
  if (authContext) request[AUTH_CONTEXT_KEY] = authContext;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const nextHandler: CallHandler = { handle: () => of("result") };

describe("TenantContextInterceptor", () => {
  it("seeds the active tenant id into CLS from the auth context", () => {
    const cls = fakeCls();
    const interceptor = new TenantContextInterceptor(cls);
    interceptor.intercept(
      contextWith({ organizationId: "org-1" }),
      nextHandler,
    );
    expect(cls.set).toHaveBeenCalledWith(TENANT_ID_CLS_KEY, "org-1");
  });

  it("sets nothing on a public/unauthenticated request", () => {
    const cls = fakeCls();
    const interceptor = new TenantContextInterceptor(cls);
    interceptor.intercept(contextWith(), nextHandler);
    expect(cls.set).not.toHaveBeenCalled();
  });

  it("sets nothing when authenticated but not in an organization yet", () => {
    const cls = fakeCls();
    const interceptor = new TenantContextInterceptor(cls);
    interceptor.intercept(
      contextWith({ organizationId: undefined }),
      nextHandler,
    );
    expect(cls.set).not.toHaveBeenCalled();
  });

  it("does not set when the CLS context is inactive", () => {
    const cls = fakeCls(false);
    const interceptor = new TenantContextInterceptor(cls);
    interceptor.intercept(
      contextWith({ organizationId: "org-1" }),
      nextHandler,
    );
    expect(cls.set).not.toHaveBeenCalled();
  });

  it("passes the handler result through unchanged", () => {
    const cls = fakeCls();
    const interceptor = new TenantContextInterceptor(cls);
    const result$ = interceptor.intercept(
      contextWith({ organizationId: "org-1" }),
      nextHandler,
    );
    return new Promise<void>((resolve) => {
      result$.subscribe((value) => {
        expect(value).toBe("result");
        resolve();
      });
    });
  });
});

describe("readTenantId", () => {
  it("reads the tenant id from CLS by the shared key", () => {
    const cls = {
      get: vi.fn().mockReturnValue("org-9"),
    } as unknown as ClsService;
    expect(readTenantId(cls)).toBe("org-9");
    expect(cls.get).toHaveBeenCalledWith(TENANT_ID_CLS_KEY);
  });
});
