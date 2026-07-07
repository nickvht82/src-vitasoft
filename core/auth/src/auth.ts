import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
} from "better-auth/plugins/organization/access";
import type { PrismaClient } from "@vitasoft/database";
import { ROLES } from "./roles.js";

/**
 * Options for {@link createAuth}.
 */
export interface CreateAuthOptions {
  /** Prisma client — the better-auth Prisma adapter persists auth state through it. */
  readonly prisma: PrismaClient;
  /**
   * Session-signing secret (>= 32 chars). Required — better-auth throws in
   * production without one; we make it explicit so a missing secret fails fast.
   */
  readonly secret: string;
  /** Public base URL of the API, e.g. `http://localhost:3001`. */
  readonly baseURL: string;
  /**
   * Path prefix the auth routes mount under (default `/v1/auth`). Must match the
   * NestJS controller route so better-auth builds correct callback/cookie URLs.
   */
  readonly basePath?: string;
  /** Extra origins allowed to send credentialed requests (frontends). */
  readonly trustedOrigins?: readonly string[];
}

/**
 * RBAC access-control statement. We keep the better-auth defaults (organization,
 * member, invitation actions) and add nothing product-specific here — coarse org
 * roles only; resource-level ReBAC is out of scope for this package.
 */
const accessControl = createAccessControl({ ...defaultStatements });

/** `admin` — full org control (inherits better-auth's built-in admin statements). */
const admin = accessControl.newRole({ ...adminAc.statements });

/** `operator` — can manage members and invitations but not the org itself. */
const operator = accessControl.newRole({
  member: ["create", "update"],
  invitation: ["create", "cancel"],
});

/** `member` — baseline, no org-management permissions. */
const member = accessControl.newRole({});

/**
 * Build a configured better-auth instance for Vitasoft.
 *
 * Email+password auth plus the organization plugin (multi-tenant: a user belongs
 * to organizations via `members`, with roles admin | operator | member). The
 * returned instance exposes `.handler` (web `Request` → `Response`) for mounting
 * and `.api.getSession` for server-side session checks in guards.
 *
 * @param options - Prisma client, secret, and URL configuration.
 * @returns The better-auth instance (framework-agnostic).
 * @example
 * const auth = createAuth({ prisma, secret, baseURL: "http://localhost:3001" });
 * const session = await auth.api.getSession({ headers });
 */
export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    database: prismaAdapter(options.prisma, { provider: "postgresql" }),
    secret: options.secret,
    baseURL: options.baseURL,
    basePath: options.basePath ?? "/v1/auth",
    trustedOrigins: options.trustedOrigins
      ? [...options.trustedOrigins]
      : undefined,
    emailAndPassword: { enabled: true },
    plugins: [
      organization({
        ac: accessControl,
        roles: { admin, operator, member },
        // The organization creator becomes an admin (Vitasoft's top org role).
        creatorRole: ROLES.ADMIN,
      }),
    ],
  });
}

/** The concrete better-auth instance type, inferred from {@link createAuth}. */
export type Auth = ReturnType<typeof createAuth>;
