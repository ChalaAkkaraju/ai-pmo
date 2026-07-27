/**
 * Session-based auth helpers.
 *
 * Replaces the URL-token model (lib/role-context.ts): identity now comes from
 * the Supabase Auth session cookie, resolved to the linked `roles` row via
 * roles.user_id. Use these from Server Components, layouts, and route handlers.
 *
 *   getSessionRole()  -> ResolvedRole | null   (no redirect)
 *   requireRole()     -> ResolvedRole          (redirects to /login if absent)
 */

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase';
import { getRoleDefinition } from './roles';
import type { ResolvedRole } from './role-context';
import type { Role } from './types';

/**
 * Resolve the authenticated user to their role row. Returns null when there is
 * no valid session or the user isn't linked to a role.
 *
 * Uses auth.getUser() (not getSession()) so the token is verified against the
 * Supabase auth server rather than trusted from the cookie alone.
 */
export async function getSessionRole(): Promise<ResolvedRole | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<Role>();

  if (error) {
    console.error('[auth] role lookup failed for user', user.id, ':', error.message);
    return null;
  }
  if (!data) return null;
  // Disabled accounts are treated as signed-out everywhere.
  if (data.disabled) return null;

  return { role: data, definition: getRoleDefinition(data.role_type) };
}

/**
 * Like getSessionRole() but redirects unauthenticated / unlinked requests to
 * /login. Use in pages and layouts that must have a signed-in colleague.
 */
export async function requireRole(): Promise<ResolvedRole> {
  const resolved = await getSessionRole();
  if (!resolved) redirect('/login');
  return resolved;
}

/**
 * Like requireRole() but also requires the admin flag. Unauthenticated callers
 * go to /login; authenticated non-admins are bounced to their dashboard. Call
 * this in the admin layout AND at the top of every admin server action, before
 * touching the service-role client.
 */
export async function requireAdmin(): Promise<ResolvedRole> {
  const resolved = await getSessionRole();
  if (!resolved) redirect('/login');
  if (!resolved.role.is_admin) redirect('/access/home');
  return resolved;
}
