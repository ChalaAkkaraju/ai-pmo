/**
 * Server-side role resolution.
 *
 * Identity now comes from the authenticated Supabase session, NOT the URL
 * token. This function is kept (with its original name and signature) so that
 * the many callers under /access/[token]/ — which pass params.token — keep
 * compiling and working during the migration off token routes. The token
 * argument is ignored; the role is resolved from the logged-in user via
 * lib/auth.getSessionRole().
 *
 * Once Stage 3 moves pages onto clean authenticated URLs, callers should switch
 * to getSessionRole()/requireRole() directly and this shim can be deleted.
 */

import type { getRoleDefinition } from './roles';
import type { Role } from './types';
import { getSessionRole } from './auth';

export interface ResolvedRole {
  role: Role;
  /** Display name + agent permissions + dashboard sections, from lib/roles.ts. */
  definition: ReturnType<typeof getRoleDefinition>;
}

/**
 * Resolve the current colleague's role from their session. Returns null when
 * there is no valid session (the caller — layout or page — should have already
 * been redirected to /login by the proxy, so null here renders as notFound).
 *
 * @param _token Ignored. Present only for backward-compatible call sites.
 */
export async function resolveRoleFromToken(_token?: string): Promise<ResolvedRole | null> {
  return getSessionRole();
}
