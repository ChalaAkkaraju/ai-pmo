/**
 * Learn-menu visibility (admin-configurable, DB-driven).
 *
 * Rules live in the learn_content table and are edited by admins in
 * /admin/learn. The header uses getVisibleLearnItems() to filter the dropdown;
 * each Learn page uses canViewLearnKey() to guard access so a hidden item can't
 * be reached by typing its URL. Admins always see everything.
 */

import { createSupabaseServiceClient } from '@/lib/supabase';
import type { ResolvedRole } from '@/lib/role-context';

export type LearnVisibility = 'everyone' | 'admin' | 'roles';

export interface LearnItem {
  key: string;
  label: string;
  path: string;
  sort_order: number;
  visibility: LearnVisibility;
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
  if (item.visibility === 'everyone') return true;
  if (item.visibility === 'admin') return false;
  return item.allowed_roles.includes(resolved.role.role_type);
}

/** The Learn items this role may see, ordered — used to build the menu. */
export async function getVisibleLearnItems(resolved: ResolvedRole): Promise<LearnItem[]> {
  const items = await getAllLearnItems();
  return items.filter((i) => canView(i, resolved));
}

/**
 * Guard helper for Learn pages. Returns false when the role may not view the
 * given key. Unknown keys are allowed (fail open) so a page is never bricked by
 * a missing rule row.
 */
export async function canViewLearnKey(key: string, resolved: ResolvedRole): Promise<boolean> {
  const items = await getAllLearnItems();
  const item = items.find((i) => i.key === key);
  return item ? canView(item, resolved) : true;
}
