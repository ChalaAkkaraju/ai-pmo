/**
 * Admin → Learn content, organised by role. Pick a role, then tick which Learn
 * items it sees. Admins always see everything. Pages guard on the same rules.
 */
import Link from 'next/link';
import { getAllLearnItems } from '@/lib/learn-content';
import { ROLE_TYPES, roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';
import { saveRoleLearn } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Learn content · AI PMO' };

const ROLES = ROLE_TYPES.filter((rt) => rt !== 'admin');

export default async function LearnAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const role: RoleType = ROLES.some((r) => r === sp.role) ? (sp.role as RoleType) : ROLES[0];
  const items = await getAllLearnItems();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Learn content by role</h1>
        <p className="text-sm text-muted-foreground">
          Pick a role, then choose which Learn items it sees. Admins always see everything. Hidden
          items are blocked by URL too, not just removed from the menu.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b pb-3">
        {ROLES.map((rt) => (
          <Link
            key={rt}
            href={`/admin/learn?role=${rt}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              rt === role ? 'bg-foreground text-background' : 'border text-muted-foreground hover:bg-muted'
            }`}
          >
            {roleLabel(rt)}
          </Link>
        ))}
      </div>

      {sp.ok && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Saved for {roleLabel(role)}.
        </p>
      )}
      {sp.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p>
      )}

      <form action={saveRoleLearn} className="rounded-lg border bg-card p-4">
        <input type="hidden" name="role" value={role} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">What can {roleLabel(role)} see?</p>
          <div className="flex items-center gap-1.5">
            <button type="submit" name="mode" value="all" className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted">Select all</button>
            <button type="submit" name="mode" value="none" className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition hover:bg-muted">Clear all</button>
            <button type="submit" name="mode" value="save" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90">Save</button>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <input type="hidden" name="all_keys" value={item.key} />
              <input
                type="checkbox"
                id={`learn_${item.key}`}
                name="checked"
                value={item.key}
                defaultChecked={item.allowed_roles.includes(role)}
              />
              <label htmlFor={`learn_${item.key}`} className="text-sm">
                {item.label} <span className="text-xs text-muted-foreground">/{item.path}</span>
              </label>
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}
