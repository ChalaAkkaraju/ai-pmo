/**
 * IT portfolio hero + attention ribbon — the same visual grammar as the revenue
 * dashboard (one headline number, a coloured mix, a health pulse, then a slim
 * ribbon of things that need someone), so the two workspaces read as one app.
 * Server-renderable: no hooks.
 */

import Link from 'next/link';
import { bucketStyle, fmtMoney, rankFiscalYear, type RankedProject } from '@/lib/it-portfolio';
import type { PortfolioAllocation } from '@/lib/types';

type P = RankedProject['project'];

export function ItPortfolioHero({ fiscalYear, years, projects, allocations }: { fiscalYear: number; years: number[]; projects: P[]; allocations: PortfolioAllocation[] }) {
  const ranking = rankFiscalYear(projects, allocations, fiscalYear);
  const allocated = ranking.reduce((n, b) => n + Number(b.allocation?.allocated_amount ?? 0), 0);
  const reserve = ranking.reduce((n, b) => n + Number(b.allocation?.reserve_amount ?? 0), 0);
  const fundable = allocated - reserve;
  const requested = ranking.reduce((n, b) => n + b.requested, 0);
  const funded = ranking.reduce((n, b) => n + b.funded_amount, 0);
  const submissions = ranking.reduce((n, b) => n + b.rows.length, 0);
  const below = ranking.reduce((n, b) => n + b.rows.filter((r) => !r.funded).length, 0);
  const unallocated = Math.max(0, fundable - funded);
  const belowAmt = ranking.reduce((n, b) => n + b.rows.filter((r) => !r.funded).reduce((m, r) => m + r.amount, 0), 0);
  const continuations = ranking.reduce((n, b) => n + b.rows.filter((r) => r.is_continuation && r.funded).reduce((m, r) => m + r.amount, 0), 0);
  const inYear = projects.filter((p) => p.fiscal_year === fiscalYear);
  const running = projects.filter((p) => p.lifecycle_status === 'active' || p.lifecycle_status === 'on_hold');
  const continuationsDue = running.filter((p) => (p.fiscal_years_approved ?? []).length > 0 && !(p.fiscal_years_approved ?? []).includes(fiscalYear) && p.fiscal_year !== fiscalYear).length;
  const excess = requested - fundable;

  const mix = [
    { key: 'proposed', label: 'Proposed', n: inYear.filter((p) => p.lifecycle_status === 'proposed').length, cls: 'bg-slate-400' },
    { key: 'approved', label: 'Approved', n: inYear.filter((p) => p.lifecycle_status === 'approved').length, cls: 'bg-blue-500' },
    { key: 'active', label: 'Active', n: inYear.filter((p) => p.lifecycle_status === 'active').length, cls: 'bg-emerald-500' },
    { key: 'on_hold', label: 'On hold', n: inYear.filter((p) => p.lifecycle_status === 'on_hold').length, cls: 'bg-amber-500' },
    { key: 'deferred', label: 'Deferred', n: inYear.filter((p) => p.lifecycle_status === 'deferred' || p.lifecycle_status === 'cancelled').length, cls: 'bg-slate-300' },
  ].filter((m) => m.n > 0);
  const mixTotal = Math.max(1, mix.reduce((n, m) => n + m.n, 0));

  return (
    <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/40 p-6 shadow-md">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:divide-x md:divide-slate-200">
        {/* Headline */}
        <div className="flex flex-col justify-center md:pr-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">FY{fiscalYear} IT envelope</p>
            <div className="flex items-center gap-1">
              {years.map((y) => (
                <Link key={y} href={`/portfolio/it?fy=${y}`} className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${y === fiscalYear ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}>FY{y}</Link>
              ))}
            </div>
          </div>
          <p className="mt-1 text-6xl font-bold tracking-tight tabular-nums">{fmtMoney(allocated)}</p>
          <p className="mt-2 text-base text-muted-foreground">{submissions} submissions across {ranking.filter((b) => b.rows.length > 0).length} buckets · {fmtMoney(requested)} requested</p>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><p className="text-sm text-muted-foreground">Fundable after reserve</p><p className="mt-0.5 font-semibold tabular-nums">{fmtMoney(fundable)} <span className="text-xs font-normal text-muted-foreground">reserve {fmtMoney(reserve)}</span></p></div>
            <div><p className="text-sm text-muted-foreground">Above the line</p><p className="mt-0.5 font-semibold tabular-nums">{fmtMoney(funded)} <span className="text-xs font-normal text-muted-foreground">{fmtMoney(unallocated)} unallocated</span></p></div>
            <div><p className="text-sm text-muted-foreground">Below the line</p><p className={`mt-0.5 font-semibold tabular-nums ${belowAmt > 0 ? 'text-amber-700' : ''}`}>{fmtMoney(belowAmt)} <span className="text-xs font-normal text-muted-foreground">{below} projects</span></p></div>
            <div><p className="text-sm text-muted-foreground">Continuations funded</p><p className="mt-0.5 font-semibold tabular-nums">{fmtMoney(continuations)} <span className="text-xs font-normal text-muted-foreground">finishing before starting</span></p></div>
          </div>
        </div>

        {/* Bucket mix */}
        <div className="flex flex-col items-center justify-center md:px-2">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Bucket mix · funded vs fundable</p>
          <div className="flex w-full flex-1 flex-col justify-center gap-4 py-1">
            {ranking.map((b) => {
              const st = bucketStyle(b.bucket);
              const pct = b.fundable > 0 ? Math.min(100, Math.round((b.funded_amount / b.fundable) * 100)) : 0;
              return (
                <a key={b.bucket} href={`#bucket-${b.bucket}`} className="-m-1.5 rounded-md p-1.5 transition hover:bg-muted/40">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: st.hex }}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.hex }} />{st.label}
                      {b.allocation?.is_mandatory_lane && <span className="ml-1 rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-900">mandatory</span>}
                    </span>
                    <span className="text-sm text-muted-foreground"><strong className="tabular-nums text-foreground">{b.rows.length}</strong> submitted · <strong className="tabular-nums" style={{ color: st.hex }}>{fmtMoney(b.funded_amount)}</strong> of {fmtMoney(b.fundable)}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: st.hex }} /></div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Pipeline mix + funding pulse */}
        <div className="flex flex-col justify-center md:pl-6">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Pipeline mix · FY{fiscalYear}</p>
          <div className="flex h-6 w-full overflow-hidden rounded-md bg-muted">
            {mix.map((m) => (
              <div key={m.key} className={`${m.cls} flex items-center justify-center text-[11px] font-semibold text-white`} style={{ width: `${(m.n / mixTotal) * 100}%` }} title={`${m.label} ${m.n}`}>{m.n}</div>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {mix.map((m) => <span key={m.key} className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${m.cls}`} />{m.label} {m.n}</span>)}
          </div>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Funding pulse</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{below}</span><span className="text-xs text-muted-foreground">below the line</span>
              <span className="mx-1 text-muted-foreground/50">·</span>
              <span className="text-3xl font-semibold tabular-nums">{continuationsDue}</span><span className="text-xs text-muted-foreground">continuations due</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${excess > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <p className="text-xs text-muted-foreground">{excess > 0 ? `Requests exceed the fundable envelope by ${fmtMoney(excess)} — the waterline decides` : 'Everything submitted fits under the line'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ItRibbon({ items }: { items: Array<{ label: string; value: number; href: string; tone?: 'neutral' | 'warn' | 'good' }> }) {
  return (
    <section className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap gap-3">
        {items.map((it) => (
          <a key={it.label} href={it.href} className={`group flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-lg border px-4 py-2 transition hover:border-foreground/30 ${it.tone === 'warn' && it.value > 0 ? 'border-amber-300 bg-amber-50/60' : it.tone === 'good' && it.value > 0 ? 'border-emerald-300 bg-emerald-50/60' : 'bg-muted/40 hover:bg-muted'}`}>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{it.label}</span>
            <span className="text-2xl font-bold tabular-nums leading-none">{it.value}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
