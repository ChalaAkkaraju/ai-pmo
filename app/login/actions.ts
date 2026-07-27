'use server';

/**
 * Auth server actions for the email/password sign-in flow.
 * signInWithPassword / signOut set and clear the Supabase session cookies via
 * the SSR server client, so no client-side token handling is needed.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';

function backToLogin(message: string, next: string): never {
  const qs = new URLSearchParams({ error: message, next });
  redirect(`/login?${qs.toString()}`);
}

export async function signIn(formData: FormData): Promise<void> {
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '') || '/access/home';

  if (!username || !password) {
    backToLogin('Enter your Login ID and password.', next);
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
    backToLogin('This account has been disabled. Please contact your administrator.', next);
  }

  let email: string | null = null;
  if (roleRow?.user_id) {
    const { data: got } = await admin.auth.admin.getUserById(roleRow.user_id);
    email = got.user?.email ?? null;
  }
  if (!email) {
    // Don't reveal whether the username exists — one generic message.
    backToLogin('Invalid Login ID or password.', next);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    backToLogin('Invalid Login ID or password.', next);
  }

  // Route by the account's state: forced password change first, then admins to
  // the admin console, everyone else to their requested destination.
  const resolved = await getSessionRole();
  if (!resolved) {
    await supabase.auth.signOut();
    backToLogin('This account is not active. Contact your administrator.', next);
  }
  if (resolved.role.must_change_password) redirect('/change-password');
  if (resolved.role.is_admin) redirect('/admin/users');
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
