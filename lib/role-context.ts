/**
 * Shared role-resolution type.
 *
 * Identity comes from the authenticated Supabase session — see
 * lib/auth.ts (getSessionRole / requireRole / requireAdmin). This module now
 * only exports the ResolvedRole shape used across the app; the former
 * URL-token shim (resolveRoleFromToken) has been removed.
 */

import type { getRoleDefinition } from './roles';
import type { Role } from './types';

export interface ResolvedRole {
  role: Role;
  /** Display name + agent permissions + dashboard sections, from lib/roles.ts. */
  definition: ReturnType<typeof getRoleDefinition>;
}
