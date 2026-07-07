import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Auth } from "./auth.js";
import {
  AUTH_CONTEXT_KEY,
  AUTH_INSTANCE,
  type AuthContext,
  type RequestWithAuth,
} from "./auth-context.js";
import { isRole } from "./roles.js";

/**
 * Convert Node/Fastify raw headers into a Web `Headers` object that better-auth
 * accepts. Array-valued headers are joined per HTTP semantics.
 */
function toWebHeaders(
  raw: Record<string, string | string[] | undefined>,
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

/**
 * Validates the better-auth session cookie on the incoming request and attaches
 * an {@link AuthContext} to it. Rejects with 401 when there is no valid session.
 *
 * @remarks
 * Presentation-layer concern only — it never touches the domain. Downstream
 * code reads `request[AUTH_CONTEXT_KEY]` (or uses `@CurrentUser()`).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const headers = toWebHeaders(request.headers);

    const session = await this.auth.api.getSession({ headers });
    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    const authContext: AuthContext = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? "",
      },
      sessionId: session.session.id,
      organizationId: session.session.activeOrganizationId ?? undefined,
      role: await this.resolveRole(headers),
    };
    request[AUTH_CONTEXT_KEY] = authContext;
    return true;
  }

  /**
   * Best-effort lookup of the caller's role in their active organization.
   * Returns undefined when the user is not in an organization yet (sign-up
   * before creating/joining one) — the RolesGuard then denies role-gated routes.
   */
  private async resolveRole(headers: Headers) {
    try {
      const result = await this.auth.api.getActiveMemberRole({ headers });
      const role = result?.role;
      return typeof role === "string" && isRole(role) ? role : undefined;
    } catch {
      return undefined;
    }
  }
}
