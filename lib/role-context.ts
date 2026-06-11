/**
 * Server-side helper to load a role from a URL token.
 *
 * Used by all dashboard pages — every page under /access/[token]/ takes the
 * token from the route params and resolves it to a Role row from Supabase.
 * If the token is missing or invalid, the caller should redirect to /invalid.
 */

import { createSupabaseServiceClient } from './supabase';
import { getRoleDefinition } from './roles';
import type { Role } from './types';

export interface ResolvedRole {
  role: Role;
  /** Display name + agent permissions + dashboard sections, from lib/roles.ts. */
  definition: ReturnType<typeof getRoleDefinition>;
}

/**
 * Look up a role by token. Returns null if not found.
 *
 * Uses the service-role client (bypasses RLS) since the URL token IS the auth
 * mechanism and we need to read the row before we know which colleague is asking.
 */
export async function resolveRoleFromToken(token: string): Promise<ResolvedRole | null> {
  if (!token || token.length < 6) return null;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('token', token)
    .maybeSingle<Role>();

  if (error || !data) {
    // Surface the real reason in server logs — a silent null here renders as a
    // bare 404, which hides config problems (bad key, unreachable DB) entirely.
    if (error) console.error('[role-context] token lookup failed:', error.message);
    return null;
  }
  return { role: data, definition: getRoleDefinition(data.role_type) };
}
