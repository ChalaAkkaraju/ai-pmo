'use server';

/**
 * Auth server actions for the email/password sign-in flow.
 * signInWithPassword / signOut set and clear the Supabase session cookies via
 * the SSR server client, so no client-side token handling is needed.
 */

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';
import { ACTING_COOKIE, getSessionRole, hostDefaultRoleType } from '@/lib/auth';
import { homePathFor, scopedTypes } from '@/lib/workspace';
import { WORKSPACES } from '@/lib/welcome-content';

function backToLogin(message: string, next: string, ws = ''): never {
  const qs = new URLSearchParams({ error: message, next });
  if (ws) qs.set('ws', ws);
  redirect(`/login?${qs.toString()}`);
}

export async function signIn(formData: FormData): Promise<void> {
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '').trim() || '/';
  const ws = String(formData.get('workspace') ?? '').trim();

  if (!username || !password) {
    backToLogin('Enter your Login ID and password.', next, ws);
  }

  // Resolve the username to the account's email (kept behind the scenes).
  const admin = createSupabaseServiceClient();
  const { data: roleRow } = await admin
    .from('roles')
    .select('user_id, disabled')
    .eq('username', username)
    .maybeSingle<{ user_id: string | null; disabled: boolean }>();

  // A disabled account gets a clear message rather than the generic one.
  if (roleRow?.disabled) {
    backToLogin('This account has been disabled. Please contact your administrator.', next, ws);
  }

  let email: string | null = null;
  if (roleRow?.user_id) {
    const { data: got } = await admin.auth.admin.getUserById(roleRow.user_id);
    email = got.user?.email ?? null;
  }
  if (!email) {
    // Don't reveal whether the username exists — one generic message.
    backToLogin('Invalid Login ID or password.', next, ws);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    backToLogin('Invalid Login ID or password.', next, ws);
  }

  // Route by the account's state: forced password change first, then admins to
  // the admin console, everyone else to their requested destination.
  const resolved = await getSessionRole();
  if (!resolved) {
    await supabase.auth.signOut();
    backToLogin('This account is not active. Contact your administrator.', next, ws);
  }
  if (resolved.role.must_change_password) redirect('/change-password');
  if (resolved.role.is_admin) redirect('/admin/users');
  // No explicit destination → each role's own home (revenue dashboard, IT portfolio, enterprise view).
  // A workspace chosen on the welcome screen: open it. The demo switcher is
  // switched into that workspace's lead role; anyone else goes there only if
  // their role can see it, otherwise to their own home.
  const story = WORKSPACES.find((w) => w.key === ws);
  if (story) {
    const me = resolved.actor ?? resolved.role;
    if (me.demo_switcher) {
      const leadType = ({ enterprise: 'portfolio_executive', it: 'it_portfolio_manager', rnd: 'rnd_portfolio_manager', capital: 'capital_portfolio_manager' } as Record<string, string>)[story.key];
      let actingId = 'self';
      if (leadType && leadType !== me.role_type) {
        const { data: lead } = await admin.from('roles').select('id').eq('role_type', leadType).eq('disabled', false).order('created_at').limit(1);
        actingId = ((lead ?? [])[0] as { id: string } | undefined)?.id ?? 'self';
      }
      (await cookies()).set(ACTING_COOKIE, actingId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
      redirect(story.href);
    }
    const reach = scopedTypes(resolved.role) as string[];
    const allowed = story.key === 'enterprise' ? resolved.role.role_type === 'portfolio_executive' : reach.includes(story.key);
    redirect(allowed ? story.href : homePathFor(resolved.role));
  }
  const explicitNext = String(formData.get('next') ?? '').trim();
  if (explicitNext) redirect(explicitNext);
  // No workspace chosen: the demo switcher on the main address starts as
  // themselves on Revenue, the main workspace; a workspace address (it-*,
  // rnd-*, capital-*) goes straight to that workspace's lead role.
  const me = resolved.actor ?? resolved.role;
  if (me.demo_switcher && !hostDefaultRoleType((await headers()).get('host'))) {
    (await cookies()).set(ACTING_COOKIE, 'self', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    redirect(homePathFor(me));
  }
  redirect(homePathFor(resolved.role));
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // Forget any demo role choice, so the next sign-in starts from the address default.
  (await cookies()).delete(ACTING_COOKIE);
  redirect('/login');
}
