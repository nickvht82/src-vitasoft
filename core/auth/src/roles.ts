/**
 * Vitasoft organization roles (RBAC). Membership + role live in the `members`
 * table (better-auth organization plugin). These are coarse-grained roles;
 * resource-level ReBAC (OpenFGA) is a future package, not this one.
 *
 * @remarks
 * Ordered by privilege, highest first. `admin` ⊇ `operator` ⊇ `member`.
 */
export const ROLES = {
  /** Full control of the organization and its members. */
  ADMIN: "admin",
  /** Day-to-day operations; can manage resources but not the org itself. */
  OPERATOR: "operator",
  /** Baseline access; read + own-resource actions. */
  MEMBER: "member",
} as const;

/** Union of the valid role string literals. */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** All roles, highest privilege first — the source of truth for {@link roleAtLeast}. */
const ROLE_HIERARCHY: readonly Role[] = [
  ROLES.ADMIN,
  ROLES.OPERATOR,
  ROLES.MEMBER,
];

/**
 * True when `actual` meets or exceeds `required` in the role hierarchy.
 *
 * @param actual - The role the member actually holds.
 * @param required - The minimum role a route demands.
 * @returns Whether access should be granted by rank.
 * @example
 * roleAtLeast("admin", "operator"); // true
 * roleAtLeast("member", "operator"); // false
 */
export function roleAtLeast(actual: string, required: Role): boolean {
  const actualRank = ROLE_HIERARCHY.indexOf(actual as Role);
  const requiredRank = ROLE_HIERARCHY.indexOf(required);
  // Unknown actual role → deny (rank -1 never satisfies a real requirement).
  if (actualRank === -1) return false;
  return actualRank <= requiredRank;
}

/** Narrow an arbitrary string to a known {@link Role}. */
export function isRole(value: string): value is Role {
  return (ROLE_HIERARCHY as readonly string[]).includes(value);
}
