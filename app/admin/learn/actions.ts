'use server';

/**
 * Admin action for Learn-menu visibility, organised by role. Adds or removes a
 * single role from each item's allowed_roles based on the checkboxes. Calls
 * requireAdmin() BEFORE touching the service-role client.
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isValidRoleType } from '@/lib/roles';

export async function saveRoleLearn(formData: FormData): Promise<void> {
  await requireAdmin();

  const role = String(formData.get('role') ?? '');
  const mode = String(formData.get('mode') ?? 'save');
  if (!isValidRoleType(role) || role === 'admin') {
    redirect('/admin/learn?error=' + encodeURIComponent('Pick a valid role.'));
  }

  const allKeys = formData.getAll('all_keys').map(String);
  let checked: Set<string>;
  if (mode === 'all') checked = new Set(allKeys);
  else if (mode === 'none') checked = new Set();
  else checked = new Set(formData.getAll('checked').map(String));

  const admin = createSupabaseServiceClient();
  const { data: rows } = await admin.from('learn_content').select('key, allowed_roles');
  for (const row of rows ?? []) {
    const current: string[] = row.allowed_roles ?? [];
    const has = current.includes(role);
    const shouldHave = checked.has(row.key);
    if (has === shouldHave) continue;
    const next = shouldHave ? [...current, role] : current.filter((r: string) => r !== role);
    await admin
      .from('learn_content')
      .update({ allowed_roles: next, updated_at: new Date().toISOString() })
      .eq('key', row.key);
  }

  revalidatePath('/admin/learn');
  revalidatePath('/', 'layout'); // refresh the Learn menu across the app
  redirect('/admin/learn?role=' + role + '&ok=1');
}
