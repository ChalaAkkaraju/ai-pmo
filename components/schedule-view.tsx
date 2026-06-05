'use client';

/**
 * Data-driven schedule — Phase 2 of the integration roadmap.
 *
 * Renders a real phase Gantt computed from `tasks` (mirrored from the scheduler
 * — Microsoft Project / Primavera P6) plus a collapsible task list.
 * Read-only; provenance is shown. Phases are grouped from the WBS code, so the
 * schedule hangs off the same work packages as the WBS tree.
 */

import { useEffect, useState } from 'react';
import { roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

export interface Task {
  wbs_code: string | null;
  name: string;
  start_date: string | null;
  finish_date: string | null;
  percent_complete: number | null;
  is_critical: boolean;
  owner_role_type: string | null;
  source_system: string;
  synced_at: string | null;
}
interface Phase {
  wbs_code: string;
  parent_wbs_code: string | null;
  name: string;
}

function sourceLabel(s: string): string {
  return s === 'MS_PROJECT' ? 'Microsoft Project' : s === 'P6' ? 'Primavera P6' : s === 'SAP_PS' ? 'SAP PS' : 'App';
}
function ms(d: string | null): number {
  return d ? new Date(d).getTime() : NaN;
}
function shortDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function ScheduleView({ tasks, workPackages }: { tasks: Task[]; workPackages: Phase[] }) {
  const [open, setOpen] = useState(false);
  // 'today' depends on Date.now(); compute it client-side after mount so the
  // server render (which has no stable 'now') doesn't cause a hydration mismatch.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  if (tasks.length === 0) {
    return (
      <section className="mt-6 rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium">No schedule yet.</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Tasks and dates are mirrored from the scheduler. Run the scheduler sync to populate them for this project.
        </p>
      </section>
    );
  }

  const starts = tasks.map((t) => ms(t.start_date)).filter((n) => !Number.isNaN(n));
  const ends = tasks.map((t) => ms(t.finish_date)).filter((n) => !Number.isNaN(n));
  const t0 = Math.min(...starts);
  const t1 = Math.max(...ends);
  const span = t1 - t0 || 1;
  const pct = (d: number) => Math.max(0, Math.min(100, ((d - t0) / span) * 100));
  const withinToday = now != null && now >= t0 && now <= t1;
  const todayPct = now != null ? pct(now) : 0;

  const phases = workPackages.filter((w) => !w.parent_wbs_code).sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));

  const rows = phases.map((ph) => {
    const inPhase = tasks.filter((t) => (t.wbs_code ?? '').startsWith(ph.wbs_code + '.'));
    const s = Math.min(...inPhase.map((t) => ms(t.start_date)).filter((n) => !Number.isNaN(n)));
    const f = Math.max(...inPhase.map((t) => ms(t.finish_date)).filter((n) => !Number.isNaN(n)));
    const wsum = inPhase.reduce((a, t) => a + (Number(t.percent_complete) || 0), 0);
    const avgPct = inPhase.length ? Math.round(wsum / inPhase.length) : 0;
    const critical = inPhase.some((t) => t.is_critical);
    return { ph, left: pct(s), width: Math.max(1.5, pct(f) - pct(s)), avgPct, critical };
  });

  const source = tasks[0]?.source_system ?? 'MS_PROJECT';
  const synced = tasks.find((t) => t.synced_at)?.synced_at ?? null;
  const overall = Math.round(tasks.reduce((a, t) => a + (Number(t.percent_complete) || 0), 0) / tasks.length);

  return (
    <section className="mt-6 overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">📅</span>
          <div>
            <p className="text-sm font-semibold">Schedule</p>
            <p className="text-xs text-muted-foreground">Phase Gantt · read-only · {tasks.length} tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-medium text-indigo-800">
            Synced from {sourceLabel(source)}{synced ? ` · ${new Date(synced).toLocaleDateString()}` : ''}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">{overall}% complete</span>
        </div>
      </div>

      {/* Gantt */}
      <div className="px-5 py-4">
        <div className="mb-1 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="w-40 flex-none" />
          <div className="relative flex-1">
            <span>{shortDate(new Date(t0).toISOString())}</span>
            {withinToday && <span className="absolute -translate-x-1/2 text-red-600" style={{ left: `${todayPct}%` }}>today</span>}
            <span className="absolute right-0">{shortDate(new Date(t1).toISOString())}</span>
          </div>
          <span className="w-10 flex-none" />
        </div>
        {rows.map((r) => (
          <div key={r.ph.wbs_code} className="flex items-center gap-3 py-1.5">
            <div className="w-40 flex-none truncate text-[13px]">
              <span className="font-mono text-xs text-muted-foreground">{r.ph.wbs_code}</span> {r.ph.name}
            </div>
            <div className="relative h-5 flex-1 rounded bg-muted/50">
              {withinToday && <div className="absolute top-0 bottom-0 z-10 w-px bg-red-500" style={{ left: `${todayPct}%` }} />}
              <div
                className={`absolute top-0.5 h-4 overflow-hidden rounded ${r.critical ? 'ring-1 ring-red-400' : ''}`}
                style={{ left: `${r.left}%`, width: `${r.width}%`, backgroundColor: '#C7D2FE' }}
                title={`${r.avgPct}% complete${r.critical ? ' · critical path' : ''}`}
              >
                <div className="h-full" style={{ width: `${r.avgPct}%`, backgroundColor: '#4F46E5' }} />
              </div>
            </div>
            <span className="w-10 flex-none text-right text-[11px] text-muted-foreground">{r.avgPct}%</span>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-3.5 rounded" style={{ backgroundColor: '#4F46E5' }} />complete</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-3.5 rounded ring-1 ring-red-400" style={{ backgroundColor: '#C7D2FE' }} />critical path</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-px bg-red-500" />today</span>
        </div>
      </div>

      {/* Task list */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 border-t px-5 py-2.5 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted/40"
      >
        <span>{open ? '▾' : '▸'}</span> {open ? 'Hide' : 'Show'} task list ({tasks.length})
      </button>
      {open && (
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">WBS</th>
                <th className="px-4 py-2 text-left">Task</th>
                <th className="px-4 py-2 text-left">Owner</th>
                <th className="px-4 py-2 text-center">Start</th>
                <th className="px-4 py-2 text-center">Finish</th>
                <th className="px-4 py-2 text-right">% complete</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...tasks].sort((a, b) => (a.wbs_code ?? '').localeCompare(b.wbs_code ?? '', undefined, { numeric: true })).map((t, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {t.wbs_code}
                    {t.is_critical && <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">critical</span>}
                  </td>
                  <td className="px-4 py-2.5">{t.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.owner_role_type ? roleLabel(t.owner_role_type as RoleType) : '—'}</td>
                  <td className="px-4 py-2.5 text-center text-xs">{shortDate(t.start_date)}</td>
                  <td className="px-4 py-2.5 text-center text-xs">{shortDate(t.finish_date)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full" style={{ width: `${Number(t.percent_complete) || 0}%`, backgroundColor: '#4F46E5' }} />
                      </span>
                      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{Number(t.percent_complete) || 0}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
