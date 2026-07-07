import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/client/client.js";
import {
  createTenantScopeExtension,
  TENANT_KEY,
  TENANT_MODELS,
  withTenantScope,
} from "./tenant-scope.js";

/**
 * Drive the extension's `$allOperations` interceptor directly with a fake
 * `query`, capturing the args it forwards. This is the unit that decides whether
 * a tenant filter is injected — testing it here proves isolation without a DB.
 */
async function runOperation(
  getTenantId: () => string | undefined,
  input: { model?: string; operation: string; args: unknown },
): Promise<{ forwarded: unknown }> {
  const ext = createTenantScopeExtension(getTenantId);
  let forwarded: unknown;
  const query = vi.fn(async (args: unknown) => {
    forwarded = args;
    return [];
  });
  await ext.query.$allModels.$allOperations({ ...input, query });
  return { forwarded };
}

const TENANT_A = "org-A";
const TENANT_B = "org-B";

describe("createTenantScopeExtension", () => {
  it("injects the tenant filter into a read on a tenant model", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    const query = vi.fn().mockResolvedValue([]);
    await ext.query.$allModels.$allOperations({
      model: "User",
      operation: "findMany",
      args: { where: { email: "a@b.co" } },
      query,
    });
    expect(query).toHaveBeenCalledWith({
      where: { email: "a@b.co", [TENANT_KEY]: TENANT_A },
    });
  });

  it("PROVES isolation: tenant A's query can never target tenant B rows even if code omits the filter", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    const query = vi.fn().mockResolvedValue([]);
    // Application code "forgets" any tenant filter — the extension adds it.
    await ext.query.$allModels.$allOperations({
      model: "User",
      operation: "findMany",
      args: {},
      query,
    });
    const passed = query.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(passed.where[TENANT_KEY]).toBe(TENANT_A);
    expect(passed.where[TENANT_KEY]).not.toBe(TENANT_B);
  });

  it("a caller cannot override the tenant key to reach another tenant", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    const query = vi.fn().mockResolvedValue([]);
    // Malicious/buggy caller tries to pin organizationId to tenant B.
    await ext.query.$allModels.$allOperations({
      model: "User",
      operation: "findFirst",
      args: { where: { [TENANT_KEY]: TENANT_B } },
      query,
    });
    const passed = query.mock.calls[0][0] as { where: Record<string, unknown> };
    // The active tenant wins — spread order puts the enforced key last.
    expect(passed.where[TENANT_KEY]).toBe(TENANT_A);
  });

  it("scopes bulk writes (updateMany / deleteMany)", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    for (const operation of ["updateMany", "deleteMany"]) {
      const query = vi.fn().mockResolvedValue({ count: 0 });
      await ext.query.$allModels.$allOperations({
        model: "User",
        operation,
        args: { where: { name: "x" } },
        query,
      });
      const passed = query.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(passed.where[TENANT_KEY]).toBe(TENANT_A);
    }
  });

  it("does NOT scope the Organization model (it is the tenant root)", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    const query = vi.fn().mockResolvedValue([]);
    await ext.query.$allModels.$allOperations({
      model: "Organization",
      operation: "findMany",
      args: { where: { slug: "acme" } },
      query,
    });
    expect(query).toHaveBeenCalledWith({ where: { slug: "acme" } });
  });

  it("leaves queries unscoped when no tenant is bound (sign-up, jobs)", async () => {
    const ext = createTenantScopeExtension(() => undefined);
    const query = vi.fn().mockResolvedValue([]);
    await ext.query.$allModels.$allOperations({
      model: "User",
      operation: "findMany",
      args: { where: { email: "a@b.co" } },
      query,
    });
    expect(query).toHaveBeenCalledWith({ where: { email: "a@b.co" } });
  });

  it("does not scope create (no where; caller sets the tenant key in data)", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    const query = vi.fn().mockResolvedValue({});
    await ext.query.$allModels.$allOperations({
      model: "User",
      operation: "create",
      args: { data: { email: "a@b.co", organizationId: TENANT_A } },
      query,
    });
    expect(query).toHaveBeenCalledWith({
      data: { email: "a@b.co", organizationId: TENANT_A },
    });
  });

  it("scopes single-record mutations (update / delete / upsert) by injecting the tenant key", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    for (const operation of ["update", "delete", "upsert"]) {
      const query = vi.fn().mockResolvedValue({});
      await ext.query.$allModels.$allOperations({
        model: "User",
        operation,
        args: { where: { id: "user-1" }, data: { name: "x" } },
        query,
      });
      const passed = query.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(passed.where[TENANT_KEY]).toBe(TENANT_A);
      // The caller's own condition survives alongside the enforced key.
      expect(passed.where.id).toBe("user-1");
    }
  });

  it("PROVES cross-tenant write isolation: A cannot update/delete B's row by id", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    for (const operation of ["update", "delete"]) {
      const query = vi.fn().mockResolvedValue({});
      // Bound to tenant A, caller targets a row known to belong to tenant B.
      await ext.query.$allModels.$allOperations({
        model: "User",
        operation,
        args: { where: { id: "b-owned-row" }, data: { name: "HACKED-BY-A" } },
        query,
      });
      const passed = query.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      // The enforced filter pins organizationId to A, so Prisma will not find
      // B's row (P2025) — the write cannot cross the tenant boundary.
      expect(passed.where[TENANT_KEY]).toBe(TENANT_A);
      expect(passed.where[TENANT_KEY]).not.toBe(TENANT_B);
    }
  });

  it("a caller cannot override the tenant key on a single-record write either", async () => {
    const ext = createTenantScopeExtension(() => TENANT_A);
    const query = vi.fn().mockResolvedValue({});
    await ext.query.$allModels.$allOperations({
      model: "User",
      operation: "update",
      args: {
        where: { id: "user-1", [TENANT_KEY]: TENANT_B },
        data: { name: "x" },
      },
      query,
    });
    const passed = query.mock.calls[0][0] as { where: Record<string, unknown> };
    // Enforced key is spread last, so it wins over the caller's attempt.
    expect(passed.where[TENANT_KEY]).toBe(TENANT_A);
  });

  it("exposes User as a tenant model and organizationId as the key", () => {
    expect(TENANT_MODELS).toContain("User");
    expect(TENANT_MODELS).not.toContain("Organization");
    expect(TENANT_KEY).toBe("organizationId");
  });

  it("does not scope models that are not in TENANT_MODELS (e.g. Session)", async () => {
    const { forwarded } = await runOperation(() => TENANT_A, {
      model: "Session",
      operation: "findMany",
      args: { where: { token: "x" } },
    });
    expect(forwarded).toEqual({ where: { token: "x" } });
  });
});

describe("withTenantScope", () => {
  it("applies the extension via the client's $extends", () => {
    const extended = Symbol("extended-client");
    const $extends = vi.fn().mockReturnValue(extended);
    const client = { $extends } as unknown as PrismaClient;

    const result = withTenantScope(client, () => TENANT_A);

    expect($extends).toHaveBeenCalledOnce();
    const passedExtension = $extends.mock.calls[0][0] as {
      name: string;
    };
    expect(passedExtension.name).toBe("vitasoft-tenant-scope");
    expect(result).toBe(extended);
  });
});
