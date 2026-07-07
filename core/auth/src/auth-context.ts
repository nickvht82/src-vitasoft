import type { Role } from "./roles.js";

/** DI token under which the better-auth instance is provided to the guards. */
export const AUTH_INSTANCE = Symbol.for("vitasoft.auth.instance");

/**
 * The authenticated principal attached to a request after {@link AuthGuard}
 * runs. Products read this instead of reaching into better-auth directly.
 */
export interface AuthContext {
  /** The signed-in user (better-auth user record, trimmed to what we rely on). */
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
  };
  /** The active session id/token — useful for audit and revocation. */
  readonly sessionId: string;
  /**
   * The active organization id (tenant). May be undefined immediately after
   * sign-up before an organization is selected/created.
   */
  readonly organizationId?: string;
  /** The member's role within the active organization, when in one. */
  readonly role?: Role;
}

/** Property name under which {@link AuthContext} is stashed on the request. */
export const AUTH_CONTEXT_KEY = "authContext";

/** A request object carrying an optional {@link AuthContext}. */
export interface RequestWithAuth {
  [AUTH_CONTEXT_KEY]?: AuthContext;
  headers: Record<string, string | string[] | undefined>;
}
