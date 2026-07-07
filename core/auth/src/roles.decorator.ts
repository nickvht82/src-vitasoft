import { SetMetadata } from "@nestjs/common";
import type { Role } from "./roles.js";

/** Reflector metadata key holding the minimum role a handler requires. */
export const ROLES_METADATA_KEY = "vitasoft:required-role";

/**
 * Require a minimum organization role on a route or controller. Works with
 * {@link RolesGuard}, which compares the caller's active member role against it
 * using the role hierarchy (admin ⊇ operator ⊇ member).
 *
 * @param role - The minimum role callers must hold.
 * @example
 * ⁣@Roles("admin")
 * ⁣@Post()
 * create() { ... }
 */
export const Roles = (role: Role) => SetMetadata(ROLES_METADATA_KEY, role);
