'use client';

/**
 * Header role menu for the demo switcher account (migration 0052).
 *
 * Trigger: who you are acting as — initials avatar in the workspace colour,
 * name and role, and a small "Demo" tag that names the real signed-in person.
 * Menu: search, "Back to me" pinned on top, then the cast grouped by
 * workspace with a coloured header per group. Picking a role sets it for
 * THIS address only and opens that role's home page.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ROLE_SHORT_LABELS } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

type Row = { id: string; name: string; role_type: RoleType };

type Group = { key: string; label: string; hex: string; test: (rt: string) => boolean };
const GROUPS: Group[] = [
  { key: 'enterprise', label: 'Enterprise', hex: '#0f172a', test: (rt) => rt === 'portfolio_executive' },
  { key: 'revenue', label: 'Revenue', hex: '#2563eb', test: (rt) => !/^(it_|rnd_|capital_)/.test(rt) && rt !== 'portfolio_executive' && rt !== 'admin' },
  { key: 'it', label: 'IT', hex: '#0d9488', test: (rt) => rt.startsWith('it_') },
  { key: 'rnd', label: 'R&D / NPI', hex: '#7c3aed', test: (rt) => rt.startsWith('rnd_') },
  { key: 'capital', label: 'Capital', hex: '#d97706', test: (rt) => rt.startsWith('capital_') },
  { key: 'admin', label: 'Administration', hex: '#64748b', test: (rt) => rt === 'admin' },
];
const groupOf = (rt: string) => GROUPS.find((g) => g.test(rt)) ?? GROUPS[1];

function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z\s.]/g, ' ').split(/[\s.]+/).filter(Boolean);
  const two = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return two.toUpperCase();
}

function Avatar({ name, hex, size = 32 }: { name: string; hex: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ backgroundColor: hex, width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  );
}

export function RoleSwitcher({ currentId, currentName, currentLabel, actorName, align = 'center' }: { currentId: string; currentName: string; currentLabel: string; actorName: string | null; align?: 'center' | 'right' }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/role/switch').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) { setRows(j.roles); setOwnId(j.own); } }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    setTimeout(() => search.current?.focus(), 0);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = rows?.find((r) => r.id === currentId);
  const currentGroup = groupOf(current?.role_type ?? '');
  const me = rows?.find((r) => r.id === ownId) ?? null;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => r.id !== ownId && (!t || r.name.toLowerCase().includes(t) || (ROLE_SHORT_LABELS[r.role_type] ?? r.role_type).toLowerCase().includes(t) || groupOf(r.role_type).label.toLowerCase().includes(t)));
  }, [rows, q, ownId]);

  async function pick(id: string) {
    if (id === currentId) { setOpen(false); return; }
    setBusy(id);
    const res = await fetch('/api/role/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role_id: id === ownId ? 'self' : id }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) window.location.href = j.home ?? '/';
    else setBusy(null);
  }

  const Item = ({ r, note }: { r: Row; note?: string }) => {
    const g = groupOf(r.role_type);
    const active = r.id === currentId;
    return (
      <button type="button" onClick={() => pick(r.id)} disabled={busy !== null}
        className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition ${active ? 'bg-slate-100' : 'hover:bg-slate-50'} disabled:opacity-60`}>
        <Avatar name={r.name} hex={g.hex} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{r.name}{note && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{note}</span>}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{ROLE_SHORT_LABELS[r.role_type] ?? r.role_type}</span>
        </span>
        {busy === r.id ? <span className="text-[11px] text-muted-foreground">Opening…</span>
          : active ? <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><path d="M3 8.5l3 3 7-7" fill="none" stroke={g.hex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
      </button>
    );
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title="Switch role"
        className={`flex items-center gap-2.5 rounded-full border bg-white py-1 pl-1 pr-3 shadow-sm transition hover:border-slate-300 hover:shadow ${open ? 'border-slate-300 ring-2 ring-slate-200' : 'border-slate-200'}`}>
        <Avatar name={currentName} hex={currentGroup.hex} size={32} />
        <span className="flex min-w-0 flex-col text-left leading-tight">
          <span className="max-w-[200px] truncate text-sm font-semibold text-foreground">{currentName}</span>
          <span className="max-w-[200px] truncate text-[11px] text-muted-foreground">{currentLabel}</span>
        </span>
        {actorName && <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 sm:inline" title={`Acting as ${currentName} · signed in as ${actorName}`}>Demo</span>}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div role="menu" className={`absolute top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border bg-white shadow-xl ${align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
          <div className="border-b bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              {actorName ? <>Signed in as <span className="font-medium text-foreground">{actorName}</span> · acting as <span className="font-medium text-foreground">{currentName}</span></> : <>Signed in as <span className="font-medium text-foreground">{currentName}</span></>}
            </p>
            <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name, role or workspace…"
              className="mt-2 w-full rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-slate-400" />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {!rows && <p className="px-2 py-3 text-sm text-muted-foreground">Loading roles…</p>}
            {me && !q && (
              <div className="mb-1 border-b pb-1.5">
                <Item r={me} note="you" />
              </div>
            )}
            {GROUPS.map((g) => {
              const items = filtered.filter((r) => g.test(r.role_type));
              if (!items.length) return null;
              return (
                <div key={g.key} className="mb-1">
                  <p className="flex items-center gap-1.5 px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: g.hex }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: g.hex }} />{g.label}
                  </p>
                  {items.map((r) => <Item key={r.id} r={r} />)}
                </div>
              );
            })}
            {rows && filtered.length === 0 && q && <p className="px-2 py-3 text-sm text-muted-foreground">No role matches &ldquo;{q}&rdquo;.</p>}
          </div>

          <p className="border-t bg-slate-50 px-3 py-2 text-[10px] text-muted-foreground">Applies to this address only. Actions you take are recorded as the role you are acting as.</p>
        </div>
      )}
    </div>
  );
}
