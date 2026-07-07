/**
 * @vitasoft/auth — better-auth setup + NestJS guards/decorators for Vitasoft.
 *
 * @remarks
 * - `createAuth(...)` builds the better-auth instance (email+password +
 *   organization multi-tenancy). Mount its `.handler` under `/v1/auth/*`.
 * - `AuthGuard` validates the session cookie and attaches an {@link AuthContext}.
 * - `RolesGuard` + `@Roles()` enforce coarse RBAC (admin | operator | member).
 * - `@CurrentUser()` injects the auth context into handlers.
 *
 * Products never import `better-auth` directly — this package is the single seam.
 */
export { createAuth, type Auth, type CreateAuthOptions } from "./auth.js";
export {
  AUTH_INSTANCE,
  AUTH_CONTEXT_KEY,
  type AuthContext,
  type RequestWithAuth,
} from "./auth-context.js";
export { AuthGuard } from "./auth.guard.js";
export { RolesGuard } from "./roles.guard.js";
export { Roles, ROLES_METADATA_KEY } from "./roles.decorator.js";
export { CurrentUser } from "./current-user.decorator.js";
export { ROLES, type Role, roleAtLeast, isRole } from "./roles.js";
