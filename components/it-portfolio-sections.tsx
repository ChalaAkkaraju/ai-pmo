/**
 * IT portfolio — the middle bands of the page, in the same order and style as
 * the revenue dashboard: watchlist tiles and insight charts. Server-renderable, pure presentation over rankFiscalYear().
 */

import Link from 'next/link';
import { toneCard, type KpiTone } from '@/lib/kpi-tone';
import { categoryLabel, fmtMoney, valueTypeLabel, type RankedProject } from '@/lib/it-portfolio';

type P = RankedProject['project'];

export function ItWatchlist({ tiles }: { tiles: Array<{ label: string; value: string; sub: string; tone?: KpiTone; href?: string }> }) {
  return (
    <section>
      <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio watchlist</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {tiles.map((t) => {
          const inner = (
            <>
              <p className="min-h-[2.5rem] text-sm font-medium uppercase leading-snug tracking-wider text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{t.value}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t.sub}</p>
            </>
          );
          const cls = `block rounded-lg border p-4 ${toneCard(t.tone)} ${t.href ? 'transition hover:border-foreground/30 hover:shadow-sm' : ''}`;
          return t.href ? <a key={t.label} href={t.href} className={cls}>{inner}</a> : <div key={t.label} className={cls}>{inner}</div>;
        })}
      </div>
    </section>
  );
}

const VALUE_COLORS: Record<string, string> = { hard_savings: '#059669', soft_benefit: '#0284c7', risk_reduction: '#7c3aed', enablement: '#4f46e5', compliance: '#d97706' };
const CATEGORY_COLORS: Record<string, string> = { design_development: '#0ea5e9', deployment: '#10b981', maintenance_upgrade: '#f59e0b' };

export function ItInsights({ fiscalYear, projects }: { fiscalYear: number; projects: P[] }) {
  const inYear = projects.filter((p) => p.fiscal_year === fiscalYear);
  const sumBy = (key: (p: P) => string | null | undefined, colors: Record<string, string>, label: (k: string) => string) => {
    const m = new Map<string, number>();
    for (const p of inYear) { const k = key(p) ?? 'other'; m.set(k, (m.get(k) ?? 0) + Number(p.requested_budget ?? 0)); }
    const total = Math.max(1, Array.from(m.values()).reduce((a, b) => a + b, 0));
    return { total, parts: Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: label(k), value: v, pct: (v / total) * 100, color: colors[k] ?? '#94a3b8' })) };
  };
  const value = sumBy((p) => p.business_case?.value_type, VALUE_COLORS, (k) => valueTypeLabel(k));
  const category = sumBy((p) => p.project_category, CATEGORY_COLORS, (k) => categoryLabel(k));
  const Stacked = ({ title, sub, data }: { title: string; sub: string; data: { total: number; parts: Array<{ key: string; label: string; value: number; pct: number; color: string }> } }) => (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3><span className="text-xs text-muted-foreground">{sub}</span></div>
      <div className="mt-3 flex h-7 w-full overflow-hidden rounded-md bg-muted">
        {data.parts.map((s) => <div key={s.key} className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${s.label} ${fmtMoney(s.value)}`}>{s.pct >= 12 ? fmtMoney(s.value) : ''}</div>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {data.parts.map((s) => <span key={s.key} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label} <strong className="text-foreground">{fmtMoney(s.value)}</strong></span>)}
      </div>
    </div>
  );
  return (
    <section>
      <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio insights</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Where the demand is, what it claims, and how far the envelope stretches.</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <Stacked title="Value claimed" sub={`${fmtMoney(value.total)} requested by value type`} data={value} />
        <Stacked title="Category mix" sub="drives the stage template and gate count" data={category} />
      </div>
    </section>
  );
}

/** Small link list used by the watchlist drill targets. */
export function ProjectLink({ code, name }: { code: string; name?: string | null }) {
  return <Link href={`/projects/${encodeURIComponent(code)}`} className="font-medium hover:underline">{code}{name ? ` · ${name}` : ''}</Link>;
}
