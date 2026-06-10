'use client';

/**
 * Data-driven Work Breakdown Structure — Phase 1 of the integration roadmap.
 *
 * Renders work_packages (the structured WBS, mirrored from SAP PS) as a
 * collapsible tree with budget (BAC) and the responsible role. Provenance is
 * shown explicitly ("synced from SAP PS · date"); the rows are read-only — the
 * system of record owns them. Distinct from the markdown WBS artefact on the
 * WBS tab, which is the human-readable companion.
 */

import { useState } from 'react';
import { roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

export interface WorkPackage {
  wbs_code: string;
  parent_wbs_code: string | null;
  name: string;
  responsible_role_type: string | null;
  is_billing_element: boolean;
  budget_bac: number | null;
  source_system: string;
  synced_at: string | null;
  status?: string;
}

function money(n: number | null): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function sourceLabel(s: string): string {
  return s === 'SAP_PS' ? 'SAP PS' : s === 'MS_PROJECT' ? 'Microsoft Project' : s === 'P6' ? 'Primavera P6' : 'App';
}

export function WbsCanonicalTree({ workPackages, mode = 'synced' }: { workPackages: WorkPackage[]; mode?: 'synced' | 'proposed' }) {
  const phases = workPackages.filter((w) => !w.parent_wbs_code).sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));
  const childrenOf = (code: string) =>
    workPackages.filter((w) => w.parent_wbs_code === code).sort((a, b) => a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));

  const totalBac = workPackages.filter((w) => !w.parent_wbs_code).reduce((s, w) => s + (w.budget_bac ?? 0), 0);
  const synced = workPackages.find((w) => w.synced_at)?.synced_at ?? null;
  const source = workPackages[0]?.source_system ?? 'SAP_PS';

  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(phases.map((p) => [p.wbs_code, true])));

  if (workPackages.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium">No work breakdown structure yet.</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          The WBS is mirrored from SAP PS. Run the SAP PS sync to populate it for this project.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">🗂️</span>
          <div>
            <p className="text-sm font-semibold">Work breakdown structure</p>
            <p className="text-xs text-muted-foreground">{mode === 'proposed' ? 'Draft for review · editable until booked' : 'Scope baseline · read-only'} · {workPackages.length} elements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'proposed' ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              Proposed by AI · not yet booked
            </span>
          ) : (
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-800">
              Synced from {sourceLabel(source)}{synced ? ` · ${new Date(synced).toLocaleDateString()}` : ''}
            </span>
          )}
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">BAC {money(totalBac)}</span>
        </div>
      </div>

      <div className="max-h-[70vh] divide-y overflow-y-auto">
        {phases.map((ph) => {
          const kids = childrenOf(ph.wbs_code);
          const isOpen = open[ph.wbs_code];
          return (
            <div key={ph.wbs_code}>
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [ph.wbs_code]: !o[ph.wbs_code] }))}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-muted/40"
              >
                <span className="w-4 text-muted-foreground">{isOpen ? '▾' : '▸'}</span>
                <span className="w-14 font-mono text-xs text-muted-foreground">{ph.wbs_code}</span>
                <span className="flex-1 text-sm font-medium">{ph.name}</span>
                {ph.is_billing_element && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">billing</span>
                )}
                <span className="w-20 text-right text-sm tabular-nums">{money(ph.budget_bac)}</span>
              </button>
              {isOpen &&
                kids.map((wp) => (
                  <div key={wp.wbs_code} className="flex items-center gap-3 px-5 py-2 pl-12">
                    <span className="w-16 font-mono text-xs text-muted-foreground">{wp.wbs_code}</span>
                    <span className="flex-1 text-[13px]">{wp.name}</span>
                    {wp.responsible_role_type && (
                      <span className="text-[11px] text-muted-foreground">{roleLabel(wp.responsible_role_type as RoleType)}</span>
                    )}
                    <span className="w-20 text-right text-[13px] tabular-nums text-muted-foreground">{money(wp.budget_bac)}</span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
