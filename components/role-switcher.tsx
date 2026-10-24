'use client';

/**
 * Header "Switch role" menu for the demo switcher account (migration 0052).
 * Shows who you are acting as and who is really signed in; picking a role
 * sets it for this address only and opens that role's home page.
 */

import { useEffect, useState } from 'react';
import { ROLE_SHORT_LABELS } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

type Row = { id: string; name: string; role_type: RoleType };

const GROUPS: Array<{ label: string; test: (rt: string) => boolean }> = [
  { label: 'Enterprise', test: (rt) => rt === 'portfolio_executive' },
  { label: 'Revenue', test: (rt) => !/^(it_|rnd_|capital_)/.test(rt) && rt !== 'portfolio_executive' && rt !== 'admin' },
  { label: 'IT', test: (rt) => rt.startsWith('it_') },
  { label: 'R&D / NPI', test: (rt) => rt.startsWith('rnd_') },
  { label: 'Capital', test: (rt) => rt.startsWith('capital_') },
  { label: 'Administration', test: (rt) => rt === 'admin' },
];

export function RoleSwitcher({ currentId, currentName, currentLabel, actorName }: { currentId: string; currentName: string; currentLabel: string; actorName: string | null }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [ownId, setOwnId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/role/switch').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) { setRows(j.roles); setOwnId(j.own); } }).catch(() => {});
  }, []);

  async function pick(id: string) {
    if (!id || id === currentId) return;
    setBusy(true);
    const res = await fetch('/api/role/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role_id: id === ownId ? 'self' : id }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) window.location.href = j.home ?? '/';
    else setBusy(false);
  }

  return (
    <div className="flex flex-col items-center leading-tight">
      <label className="relative inline-flex items-center gap-1">
        <span className="sr-only">Switch role</span>
        <select
          value={currentId}
          disabled={busy || !rows}
          onChange={(e) => pick(e.target.value)}
          className="max-w-[260px] cursor-pointer appearance-none rounded-md border border-transparent bg-transparent py-0.5 pl-2 pr-6 text-center text-sm font-semibold text-foreground hover:border-border focus:border-border focus:outline-none"
          title="Switch role (demo)"
        >
          {!rows && <option value={currentId}>{currentName}</option>}
          {rows && GROUPS.map((g) => {
            const items = rows.filter((r) => g.test(r.role_type));
            if (!items.length) return null;
            return (
              <optgroup key={g.label} label={g.label}>
                {items.map((r) => <option key={r.id} value={r.id}>{r.name} — {ROLE_SHORT_LABELS[r.role_type] ?? r.role_type}{r.id === ownId ? ' (you)' : ''}</option>)}
              </optgroup>
            );
          })}
        </select>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="pointer-events-none absolute right-1.5 opacity-60"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </label>
      <span className="text-[11px] text-muted-foreground">
        {currentLabel}
        {actorName ? <span className="ml-1 rounded bg-amber-100 px-1 py-px text-[10px] font-medium text-amber-900">acting · signed in as {actorName}</span> : <span className="ml-1 text-[10px]">· switch role ▾</span>}
      </span>
    </div>
  );
}
