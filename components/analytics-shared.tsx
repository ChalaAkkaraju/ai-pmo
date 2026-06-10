/**
 * Shared presentational pieces + helpers for the analytics pages
 * (/analytics/actions, /analytics/issues, /analytics/risks). Pure rendering and
 * data shaping — no hooks — so these can be used directly in server components.
 */

import { toneCard, toneText, type KpiTone } from '@/lib/kpi-tone';

export type Row = { label: string; count: number };

export function tally<T>(items: T[], keyFn: (t: T) => string | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Map → rows, honouring an optional fixed order; remaining keys appended by count desc. */
export function rowsFrom(m: Map<string, number>, order?: string[]): Row[] {
  const rows: Row[] = [];
  const seen = new Set<string>();
  if (order) {
    for (const k of order) {
      if (m.has(k)) {
        rows.push({ label: k, count: m.get(k)! });
        seen.add(k);
      }
    }
  }
  const rest = [...m.entries()]
    .filter(([k]) => !seen.has(k))
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
  return [...rows, ...rest];
}

/** Re-key a severity/impact map (H/M/L) to friendly labels. */
export function renameHML(m: Map<string, number>): Map<string, number> {
  return new Map(
    [...m.entries()].map(([k, v]) => [k === 'H' ? 'High' : k === 'L' ? 'Low' : k === 'M' ? 'Medium' : k, v]),
  );
}

export function BreakdownTable({ title, rows, color }: { title: string; rows: Row[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-muted/40 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No data yet.</p>
      ) : (
        rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[1.2fr_1.6fr_auto] items-center gap-2 border-b px-3 py-1 last:border-0"
          >
            <span className="truncate text-[13px]">{r.label}</span>
            <span className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round((r.count / max) * 100)}%`, backgroundColor: color }}
              />
            </span>
            <strong className="text-right text-[13px] tabular-nums">{r.count}</strong>
          </div>
        ))
      )}
    </div>
  );
}

export function Kpis({
  items,
}: {
  items: { label: string; value: string | number; tone?: KpiTone }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {items.map((k) => (
        <div key={k.label} className={`rounded-lg border px-3 py-2.5 ${toneCard(k.tone)}`}>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
          <p className={`mt-0.5 text-xl font-semibold tabular-nums ${toneText(k.tone)}`}>{k.value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Collapse the many granular risk-status strings in the seed data
 * (e.g. "Realised — closed", "Active — mitigated to date") into a small,
 * legible set of buckets for charts. Display-only — does not change the data.
 */
export function bucketRiskStatus(status: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('not materialised') || s.includes('not materialized')) return 'Not materialised';
  if (s.includes('realis') || s.includes('realiz')) return 'Realised';
  if (s.includes('mitigat')) return 'Mitigated';
  if (s.startsWith('active')) return 'Active';
  if (s === 'open' || s.startsWith('open')) return 'Open';
  return 'Other';
}

export const RISK_STATUS_ORDER = ['Open', 'Active', 'Mitigated', 'Realised', 'Not materialised', 'Other'];

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
