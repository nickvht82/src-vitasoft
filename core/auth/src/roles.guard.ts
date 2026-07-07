import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  AUTH_CONTEXT_KEY,
  type RequestWithAuth,
} from "./auth-context.js";
import { type Role, roleAtLeast } from "./roles.js";
import { ROLES_METADATA_KEY } from "./roles.decorator.js";

/**
 * Enforces the `@Roles()` requirement using the role hierarchy. Runs *after*
 * {@link AuthGuard} (which populates the request's auth context), so a route
 * that uses `@Roles()` must also be guarded by `AuthGuard`.
 *
 * @remarks
 * When a handler has no `@Roles()` metadata this guard is a no-op (allow) — it
 * only gates routes that explicitly declare a minimum role.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authContext = request[AUTH_CONTEXT_KEY];
    const role = authContext?.role;

    if (!role || !roleAtLeast(role, required)) {
      throw new ForbiddenException(
        `Requires role "${required}" in the active organization.`,
      );
    }
    return true;
  }
}
