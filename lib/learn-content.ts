/**
 * Learn-menu visibility (admin-configurable, DB-driven, per role).
 *
 * Each learn_content row carries allowed_roles — the role_types that may see
 * the item. Admins always see everything. Admins edit these in /admin/learn
 * (organised by role). The header filters the dropdown with
 * getVisibleLearnItems(); each Learn page guards with canViewLearnKey() so a
 * hidden item can't be reached by URL.
 */

import { createSupabaseServiceClient } from '@/lib/supabase';
import type { ResolvedRole } from '@/lib/role-context';

export interface LearnItem {
  key: string;
  label: string;
  path: string;
  sort_order: number;
  allowed_roles: string[];
}

/** All Learn items, ordered for display. */
export async function getAllLearnItems(): Promise<LearnItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('learn_content')
    .select('*')
    .order('sort_order', { ascending: true });
  return (data ?? []) as LearnItem[];
}

/** Can this role see this item? Admins always can. */
export function canView(item: LearnItem, resolved: ResolvedRole): boolean {
  if (resolved.role.is_admin) return true;
  return item.allowed_roles.includes(resolved.role.role_type);
}

/** The Learn items this role may see, ordered — used to build the menu. */
export async function getVisibleLearnItems(resolved: ResolvedRole): Promise<LearnItem[]> {
  const items = await getAllLearnItems();
  return items.filter((i) => canView(i, resolved));
}

/** Guard helper for Learn pages. Unknown keys are allowed (fail open). */
export async function canViewLearnKey(key: string, resolved: ResolvedRole): Promise<boolean> {
  const items = await getAllLearnItems();
  const item = items.find((i) => i.key === key);
  return item ? canView(item, resolved) : true;
}
