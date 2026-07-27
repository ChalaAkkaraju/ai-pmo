'use server';

/**
 * Admin user-management server actions.
 *
 * SECURITY: every action calls requireAdmin() BEFORE it touches the
 * service-role client. The service-role key bypasses all RLS, so that check is
 * the only thing between these mutations and the public internet. Do not add an
 * action here that reaches createSupabaseServiceClient() without it.
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getRoleDefinition, isValidRoleType } from '@/lib/roles';

const BAN_FOREVER = '876000h'; // ~100 years; 'none' lifts the ban.

function back(message?: string): never {
  redirect(message ? '/admin/users?error=' + encodeURIComponent(message) : '/admin/users?ok=1');
}

export async function createUser(formData: FormData): Promise<void> {
  await requireAdmin();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const firstName = String(formData.get('first_name') ?? '').trim();
  const lastName = String(formData.get('last_name') ?? '').trim();
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const roleType = String(formData.get('role_type') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !firstName || !lastName || !username || !password) back('First name, last name, Login ID, email and password are all required.');
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) back('Login ID must be 3–32 characters: letters, numbers, dot, dash or underscore.');
  if (password.length < 8) back('Initial password must be at least 8 characters.');
  if (!isValidRoleType(roleType)) back('Pick a valid role.');

  const admin = createSupabaseServiceClient();
  const isAdmin = roleType === 'admin';

  // Username must be unique (case-insensitive). Check before creating the auth user.
  const { data: takenBy } = await admin.from('roles').select('id').eq('username', username).maybeSingle();
  if (takenBy) back('That Login ID is already taken.');

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role_type: roleType },
    app_metadata: { must_change_password: true },
  });
  if (createErr || !created?.user) {
    back('Could not create the account — the email may already be in use. (' + (createErr?.message ?? 'unknown error') + ')');
  }

  const { error: insertErr } = await admin.from('roles').insert({
    name,
    username,
    role_type: roleType,
    is_admin: isAdmin,
    disabled: false,
    must_change_password: true,
    user_id: created.user.id,
    allowed_agents: getRoleDefinition(roleType).allowed_agents,
  });
  if (insertErr) {
    // Roll back the auth user so we never leave an orphan with no role row.
    await admin.auth.admin.deleteUser(created.user.id);
    back('Could not save the role: ' + insertErr.message);
  }

  revalidatePath('/admin/users');
  back();
}

export async function setRole(formData: FormData): Promise<void> {
  const acting = await requireAdmin();

  const roleId = String(formData.get('role_id') ?? '');
  const userId = String(formData.get('user_id') ?? '');
  const roleType = String(formData.get('role_type') ?? '');
  if (!roleId || !isValidRoleType(roleType)) back('Pick a valid role.');
  if (acting.role.id === roleId && roleType !== 'admin') {
    back('You can not remove your own administrator access.');
  }

  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from('roles')
    .update({
      role_type: roleType,
      is_admin: roleType === 'admin',
      allowed_agents: getRoleDefinition(roleType).allowed_agents,
    })
    .eq('id', roleId);
  if (error) back('Could not change the role: ' + error.message);

  if (userId) {
    await admin.auth.admin.updateUserById(userId, { user_metadata: { role_type: roleType } });
  }
  revalidatePath('/admin/users');
  back();
}

export async function setDisabled(formData: FormData): Promise<void> {
  const acting = await requireAdmin();

  const roleId = String(formData.get('role_id') ?? '');
  const userId = String(formData.get('user_id') ?? '');
  const disabled = String(formData.get('disabled') ?? '') === 'true';
  if (!roleId) back('Missing account.');
  if (userId && acting.role.user_id === userId) back('You can not disable your own account.');

  const admin = createSupabaseServiceClient();
  const { error } = await admin.from('roles').update({ disabled }).eq('id', roleId);
  if (error) back('Could not update status: ' + error.message);

  if (userId) {
    // Ban in Supabase Auth so a disabled person can't sign in or keep a session.
    await admin.auth.admin.updateUserById(userId, { ban_duration: disabled ? BAN_FOREVER : 'none' });
  }
  revalidatePath('/admin/users');
  back();
}
