'use server';

/**
 * First-login password change. The user sets their own password; we then clear
 * the must_change_password flag in both the auth user's app_metadata (the proxy
 * gate) and the roles row (admin view + login routing).
 */
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase';
import { getSessionRole } from '@/lib/auth';

function back(message: string): never {
  redirect('/change-password?error=' + encodeURIComponent(message));
}

export async function changePassword(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) back('Password must be at least 8 characters.');
  if (password !== confirm) back('The two passwords do not match.');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) redirect('/login');

  const { error: updErr } = await supabase.auth.updateUser({ password });
  if (updErr) back('Could not update the password: ' + updErr.message);

  const admin = createSupabaseServiceClient();
  await admin.auth.admin.updateUserById(user.id, { app_metadata: { must_change_password: false } });
  await admin.from('roles').update({ must_change_password: false }).eq('user_id', user.id);

  const resolved = await getSessionRole();
  redirect(resolved?.role.is_admin ? '/admin/users' : '/dashboard');
}
