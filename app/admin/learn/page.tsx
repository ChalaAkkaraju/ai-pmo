/**
 * Admin → Learn content, organised by role. Pick a role, then toggle which
 * Learn items it sees. Admins always see everything. Pages guard on the same
 * rules. Visual-only styling; the form + action are unchanged.
 */
import Link from 'next/link';
import { getAllLearnItems } from '@/lib/learn-content';
import { ROLE_TYPES, roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';
import { saveRoleLearn } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Learn content · AI PMO' };

const ROLES = ROLE_TYPES.filter((rt) => rt !== 'admin');

// Icon + colour per Learn item, keyed by item key.
const DECOR: Record<string, { emoji: string; chip: string }> = {
  learn: { emoji: '📚', chip: 'bg-indigo-100 text-indigo-700' },
  about: { emoji: '🧭', chip: 'bg-sky-100 text-sky-700' },
  architecture: { emoji: '🏗️', chip: 'bg-amber-100 text-amber-700' },
  framework: { emoji: '📐', chip: 'bg-violet-100 text-violet-700' },
  agents: { emoji: '🤖', chip: 'bg-emerald-100 text-emerald-700' },
  concepts: { emoji: '💡', chip: 'bg-yellow-100 text-yellow-700' },
  training: { emoji: '🎓', chip: 'bg-rose-100 text-rose-700' },
  technical: { emoji: '🔧', chip: 'bg-slate-100 text-slate-700' },
};
const FALLBACK = { emoji: '📄', chip: 'bg-slate-100 text-slate-700' };

export default async function LearnAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const role: RoleType = ROLES.some((r) => r === sp.role) ? (sp.role as RoleType) : ROLES[0];
  const items = await getAllLearnItems();
  const visibleCount = items.filter((i) => i.allowed_roles.includes(role)).length;

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-6 space-y-5">
      {/* Gradient header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 px-6 py-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span>✨</span> Learn content by role
        </div>
        <p className="mt-1 max-w-2xl text-sm text-white/85">
          Pick a role, then flip which Learn items it sees. Admins always see everything, and hidden
          items are blocked by URL too — not just removed from the menu.
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((rt) => {
          const active = rt === role;
          return (
            <Link
              key={rt}
              href={`/admin/learn?role=${rt}`}
              className={
                active
                  ? 'rounded-full bg-gradient-to-r from-indigo-600 to-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow'
                  : 'rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
              }
            >
              {roleLabel(rt)}
            </Link>
          );
        })}
      </div>

      {sp.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          ✓ Saved for {roleLabel(role)}.
        </p>
      )}
      {sp.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p>
      )}

      <form action={saveRoleLearn} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-800">What can {roleLabel(role)} see?</h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {visibleCount} / {items.length} visible
            </span>
          </div>
          <input type="hidden" name="role" value={role} />
          <div className="flex items-center gap-1.5">
            <button type="submit" name="mode" value="all" className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50">Select all</button>
            <button type="submit" name="mode" value="none" className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50">Clear all</button>
            <button type="submit" name="mode" value="save" className="rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:opacity-90">Save</button>
          </div>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {items.map((item) => {
            const d = DECOR[item.key] ?? FALLBACK;
            return (
              <li key={item.key}>
                <input type="hidden" name="all_keys" value={item.key} />
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow">
                  <input
                    type="checkbox"
                    name="checked"
                    value={item.key}
                    defaultChecked={item.allowed_roles.includes(role)}
                    className="peer sr-only"
                  />
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${d.chip}`}>
                    {d.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                    <span className="block truncate font-mono text-[11px] text-slate-400">/{item.path}</span>
                  </span>
                  <span className="hidden text-[11px] font-semibold text-emerald-600 peer-checked:inline">Visible</span>
                  <span className="text-[11px] font-medium text-slate-400 peer-checked:hidden">Hidden</span>
                  <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
                </label>
              </li>
            );
          })}
        </ul>
      </form>
    </div>
  );
}
