/**
 * Session-based auth helpers.
 *
 * Replaces the URL-token model (lib/role-context.ts): identity now comes from
 * the Supabase Auth session cookie, resolved to the linked `roles` row via
 * roles.user_id. Use these from Server Components, layouts, and route handlers.
 *
 *   getSessionRole()  -> ResolvedRole | null   (no redirect)
 *   requireRole()     -> ResolvedRole          (redirects to /login if absent)
 *
 * Demo role switcher (migration 0052): when the signed-in role has
 * demo_switcher = true, the resolved role is the one it is ACTING AS —
 * chosen in the header (cookie `aipmo_acting_role`, per address) or, when
 * nothing is chosen, defaulted from the address: it-*  → IT Portfolio Manager,
 * rnd-* → R&D Portfolio Manager, capital-* → Capital Portfolio Manager. The
 * real signed-in role is returned as `actor`.
 */

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createSupabaseServerClient } from './supabase';
import { getRoleDefinition } from './roles';
import type { ResolvedRole } from './role-context';
import type { Role, RoleType } from './types';

export const ACTING_COOKIE = 'aipmo_acting_role';
/** Cookie value meaning "use my own role here", overriding the address default. */
export const ACTING_SELF = 'self';

/** The role an address implies for a demo switcher, if any. */
export function hostDefaultRoleType(host: string | null | undefined): RoleType | null {
  const h = (host ?? '').toLowerCase();
  if (/^it[-.]/.test(h)) return 'it_portfolio_manager';
  if (/^rnd[-.]/.test(h)) return 'rnd_portfolio_manager';
  if (/^capital[-.]/.test(h)) return 'capital_portfolio_manager';
  // Local four-site setup: one port per workspace.
  if (/^(localhost|127\.0\.0\.1):3101$/.test(h)) return 'it_portfolio_manager';
  if (/^(localhost|127\.0\.0\.1):3102$/.test(h)) return 'rnd_portfolio_manager';
  if (/^(localhost|127\.0\.0\.1):3103$/.test(h)) return 'capital_portfolio_manager';
  return null;
}

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

  if (data.demo_switcher) {
    const acting = await resolveActingRole(supabase, data);
    if (acting) return { role: acting, definition: getRoleDefinition(acting.role_type), actor: data };
  }
  return { role: data, definition: getRoleDefinition(data.role_type) };
}

async function resolveActingRole(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, own: Role): Promise<Role | null> {
  let chosen: string | undefined;
  let host: string | null = null;
  try {
    chosen = (await cookies()).get(ACTING_COOKIE)?.value;
    host = (await headers()).get('host');
  } catch {
    return null; // outside a request scope
  }
  if (chosen === ACTING_SELF || chosen === own.id) return null;
  if (chosen) {
    const { data } = await supabase.from('roles').select('*').eq('id', chosen).maybeSingle<Role>();
    if (data && !data.disabled) return data;
    return null;
  }
  const rt = hostDefaultRoleType(host);
  if (!rt || rt === own.role_type) return null;
  const { data } = await supabase.from('roles').select('*').eq('role_type', rt).eq('disabled', false).order('created_at').limit(1);
  return ((data ?? [])[0] as Role | undefined) ?? null;
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
  if (!resolved.role.is_admin) redirect('/dashboard');
  return resolved;
}
