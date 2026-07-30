'use server';

/**
 * Admin action for Learn-menu visibility. Like the user-admin actions, this
 * calls requireAdmin() BEFORE touching the service-role client.
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { isValidRoleType } from '@/lib/roles';

const VALID = ['everyone', 'admin', 'roles'];

export async function setLearnVisibility(formData: FormData): Promise<void> {
  await requireAdmin();

  const key = String(formData.get('key') ?? '').trim();
  const visibility = String(formData.get('visibility') ?? 'everyone');
  const roles = formData.getAll('roles').map(String).filter((r) => isValidRoleType(r));

  if (!key) redirect('/admin/learn?error=' + encodeURIComponent('Missing item key.'));
  if (!VALID.includes(visibility)) redirect('/admin/learn?error=' + encodeURIComponent('Invalid visibility.'));

  const admin = createSupabaseServiceClient();
  const { error } = await admin
    .from('learn_content')
    .update({
      visibility,
      allowed_roles: visibility === 'roles' ? roles : [],
      updated_at: new Date().toISOString(),
    })
    .eq('key', key);

  if (error) redirect('/admin/learn?error=' + encodeURIComponent(error.message));

  revalidatePath('/admin/learn');
  revalidatePath('/', 'layout'); // refresh the Learn menu across the app
  redirect('/admin/learn?ok=1');
}
