/**
 * Enterprise portfolio — the cross-type layer (proposal §4.6). One screen across
 * PMOs for the CFO / head of portfolio: counts, states, dates, ratios, resource
 * movement and open decisions. Never absolute money or performance indices
 * compared across types. Revenue and IT are live; Capital and R&D / NPI appear
 * as placeholders until their phases land.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { scopedTypes } from '@/lib/workspace';
import { loadEnterpriseView } from '@/lib/cross-type';
import type { ProjectType } from '@/lib/types';
import { AskAgentButton } from '@/components/ask-agent-button';

export const dynamic = 'force-dynamic';

// Illustrative "needs attention" signals for the PMOs not yet on the platform (Phase 2 / Phase 3). Demo data only.
const DEMO_ATTENTION: Record<string, { signal: string; n: number }[]> = {
  capital: [
    { signal: 'AFE overrun risk', n: 2 },
    { signal: 'Supplementary AFE awaiting approval', n: 1 },
    { signal: 'Commissioning date slipped', n: 1 },
  ],
  rnd: [
    { signal: 'Stage gate slipped', n: 2 },
    { signal: 'Stage budget over 90% consumed', n: 2 },
    { signal: 'Kill / redirect recommended', n: 1 },
  ],
};

const TYPE_STYLE: Record<ProjectType, { hex: string; bar: string; soft: string; text: string }> = {
  revenue: { hex: '#2563eb', bar: 'bg-blue-600', soft: 'bg-blue-50', text: 'text-blue-700' },
  it: { hex: '#0f766e', bar: 'bg-teal-600', soft: 'bg-teal-50', text: 'text-teal-700' },
  capital: { hex: '#d97706', bar: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700' },
  rnd: { hex: '#7c3aed', bar: 'bg-violet-600', soft: 'bg-violet-50', text: 'text-violet-700' },
};
const TYPE_LABEL: Record<ProjectType, string> = { revenue: 'Revenue', it: 'IT', capital: 'Capital', rnd: 'R&D / NPI' };

function money(n: number): string {
  const a = Math.abs(n);
  return a >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : a >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`;
}
function pct(v: number | null | undefined, dp = 1): string { return v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(dp)}%`; }

function TypeChip({ t }: { t: ProjectType }) {
  return <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: TYPE_STYLE[t].hex }}>{TYPE_LABEL[t]}</span>;
}

export default async function EnterprisePortfolioPage() {
  const resolved = await getSessionRole();
  // The cross-type view is for roles that span more than one project type (admin, portfolio executives).
  if (!resolved || scopedTypes(resolved.role).length < 2) notFound();
  const view = await loadEnterpriseView(createSupabaseServiceClient());
  const open = view.attention;
  const awaiting = open.filter((a) => a.signal.startsWith('Awaiting')).length;
  const holds = open.filter((a) => a.signal.startsWith('Hold') || a.signal === 'On hold').length;
  const displaced = view.movements.filter((m) => !m.toDate).length;
  const live = view.types.filter((t) => t.live);
  const totalProjects = live.reduce((n, t) => n + t.total, 0);

  return (
    <div className="container mx-auto max-w-screen-2xl space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Enterprise view · all PMOs</p>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise portfolio</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">One platform, four project types, one place to see what needs a decision. This layer carries counts, dates, states, ratios and people movement — each PMO keeps its own money and its own measures.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {resolved.definition.allowed_agents.includes('executive_briefing_writer') && <AskAgentButton agentType="executive_briefing_writer" prompt="Write this month's enterprise portfolio brief for the leadership meeting." label="✨ Draft the board pack" />}
          {resolved.definition.allowed_agents.includes('governance_health_reviewer') && <AskAgentButton agentType="governance_health_reviewer" prompt="Is our delegation of authority working? Review the last 90 days of decisions." label="✨ Review governance health" />}
          <Link href="/dashboard" className="rounded-md border px-3 py-1.5 font-medium transition hover:bg-muted">Revenue workspace →</Link>
          <Link href="/portfolio/it" className="rounded-md border px-3 py-1.5 font-medium transition hover:bg-muted">IT workspace →</Link>
        </div>
      </div>

      {/* HERO — one card per PMO */}
      <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 shadow-md">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Projects under governance</p>
            <p className="mt-1 text-6xl font-bold tracking-tight tabular-nums">{totalProjects}</p>
            <p className="mt-2 text-base text-muted-foreground">{live.length} of 4 PMOs live on the platform · {open.length} items need someone&rsquo;s attention today · Capital and R&D / NPI shown with illustrative demo data</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {view.types.map((t) => <span key={t.type} className={`rounded-full px-3 py-1 text-xs font-semibold ${t.live ? 'text-white' : 'border border-dashed text-muted-foreground'}`} style={t.live ? { backgroundColor: TYPE_STYLE[t.type].hex } : undefined}>{t.label}{t.live ? '' : ` · ${t.phase}`}</span>)}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {view.types.map((t) => {
            const st = TYPE_STYLE[t.type];
            const mixTotal = Math.max(1, t.mix.reduce((n, m) => n + m.n, 0));
            const inner = (
              <>
                <span className={`absolute left-0 top-0 h-full w-1.5 ${st.bar} ${t.live ? '' : 'opacity-50'}`} />
                <div className="pl-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: st.hex }}>{t.label}</span>
                    {t.live ? <span className="text-base text-muted-foreground/50">▸</span> : <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-900">{t.phase} · demo data</span>}
                  </div>
                  {t.live || t.total > 0 ? (
                    <>
                      <p className="mt-2 text-4xl font-semibold tabular-nums">{t.total}</p>
                      <p className="text-sm text-muted-foreground">projects · {t.attention} of {t.inScope} {t.inScopeLabel} need attention</p>
                      <div className="mt-4 flex h-6 w-full overflow-hidden rounded-md bg-muted">
                        {t.mix.map((m) => <div key={m.key} className={`${m.cls} flex items-center justify-center text-[11px] font-semibold text-white`} style={{ width: `${(m.n / mixTotal) * 100}%` }} title={`${m.label} ${m.n}`}>{m.n}</div>)}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">{t.mix.map((m) => <span key={m.key} className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${m.cls}`} />{m.label}</span>)}</div>
                      <dl className="mt-3 text-xs"><dt className="text-muted-foreground">Health, in this PMO&rsquo;s own terms</dt><dd className="text-2xl font-semibold tabular-nums">{t.headline}</dd><dd className="text-[11px] text-muted-foreground">{t.headlineSub}</dd></dl>
                      {!t.live && <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-900">Illustrative only — {t.label} joins the platform in {t.phase}.</p>}
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-4xl font-semibold tabular-nums text-slate-300">—</p>
                      <p className="text-sm text-muted-foreground">not yet on the platform</p>
                      <div className="mt-4 h-6 w-full rounded-md border border-dashed" />
                      <dl className="mt-3 text-xs"><dt className="text-muted-foreground">Will bring</dt><dd className="text-sm font-medium text-slate-600">{t.headlineSub}</dd></dl>
                    </>
                  )}
                </div>
              </>
            );
            const cls = `relative overflow-hidden rounded-lg border p-4 text-left ${t.live ? 'bg-card transition hover:border-foreground/30 hover:shadow-sm' : 'border-dashed border-amber-300 bg-amber-50/20'}`;
            return t.live ? <Link key={t.type} href={t.href} className={cls}>{inner}</Link> : <div key={t.type} className={cls}>{inner}</div>;
          })}
        </div>
      </section>

      {/* Ribbon */}
      <section className="rounded-lg border bg-card px-4 py-3">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Needs attention', value: open.length, tone: open.length ? 'border-amber-300 bg-amber-50/60' : 'bg-muted/40', href: '#attention' },
            { label: 'Awaiting a decision', value: awaiting, tone: awaiting ? 'border-sky-300 bg-sky-50/60' : 'bg-muted/40', href: '#attention' },
            { label: 'Holds', value: holds, tone: holds ? 'border-amber-300 bg-amber-50/60' : 'bg-muted/40', href: '#attention' },
            { label: 'People displaced', value: displaced, tone: displaced ? 'border-rose-300 bg-rose-50/60' : 'bg-muted/40', href: '#movement' },
          ].map((it) => (
            <a key={it.label} href={it.href} className={`flex min-w-[150px] flex-1 items-center justify-between gap-3 rounded-lg border px-4 py-2 transition hover:border-foreground/30 ${it.tone}`}>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{it.label}</span>
              <span className="text-2xl font-bold tabular-nums leading-none">{it.value}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Attention across PMOs — summarised for an executive; detail one click away */}
      <section id="attention">
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">What needs attention</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Counted by signal, in each PMO&rsquo;s own terms. The PMOs work the lists in their workspaces; this page shows the shape.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {view.types.map((t) => {
            if (!t.live) {
              const demo = DEMO_ATTENTION[t.type] ?? [];
              const total = demo.reduce((n, d) => n + d.n, 0);
              return (
                <div key={t.type} className="relative overflow-hidden rounded-xl border border-dashed border-amber-300 bg-amber-50/30 p-4 shadow-sm">
                  <span className={`absolute left-0 top-0 h-full w-1.5 ${TYPE_STYLE[t.type].bar} opacity-60`} />
                  <div className="flex items-baseline justify-between pl-2">
                    <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: TYPE_STYLE[t.type].hex }}>{t.label}<span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-900">{t.phase} · demo data</span></span>
                    <span className="text-2xl font-semibold tabular-nums">{total}<span className="ml-1 text-xs font-normal text-muted-foreground">of {t.inScope} {t.inScopeLabel}</span></span>
                  </div>
                  <ul className="mt-2 space-y-1.5 pl-2">
                    {demo.map((d) => (
                      <li key={d.signal} className="flex items-center gap-3 text-sm">
                        <span className="w-8 text-right text-base font-semibold tabular-nums">{d.n}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full opacity-70" style={{ width: `${Math.round((d.n / Math.max(1, total)) * 100)}%`, backgroundColor: TYPE_STYLE[t.type].hex }} /></span>
                        <span className="w-56 truncate text-muted-foreground">{d.signal}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 pl-2 text-[11px] text-amber-900">Illustrative signals to show the shape of the {t.label} list; live in {t.phase}.</p>
                </div>
              );
            }
            const items = open.filter((a) => a.type === t.type);
            const groups = Array.from(items.reduce((m, a) => m.set(a.signal, (m.get(a.signal) ?? 0) + 1), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);
            return (
              <div key={t.type} className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
                <span className={`absolute left-0 top-0 h-full w-1.5 ${TYPE_STYLE[t.type].bar}`} />
                <div className="flex items-baseline justify-between pl-2"><span className="text-sm font-semibold" style={{ color: TYPE_STYLE[t.type].hex }}>{t.label}</span><span className="text-2xl font-semibold tabular-nums">{items.length}<span className="ml-1 text-xs font-normal text-muted-foreground">of {t.inScope} {t.inScopeLabel}</span></span></div>
                {groups.length === 0 ? <p className="mt-2 pl-2 text-sm text-muted-foreground">Nothing flagged.</p> : (
                  <ul className="mt-2 space-y-1.5 pl-2">
                    {groups.map(([signal, n]) => (
                      <li key={signal} className="flex items-center gap-3 text-sm">
                        <span className="w-8 text-right text-base font-semibold tabular-nums">{n}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${Math.round((n / Math.max(1, items.length)) * 100)}%`, backgroundColor: TYPE_STYLE[t.type].hex }} /></span>
                        <span className="w-56 truncate text-muted-foreground">{signal}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={t.href} className="mt-3 inline-block pl-2 text-xs font-medium hover:underline">Open the {t.label} workspace →</Link>
              </div>
            );
          })}
        </div>

      </section>

      {/* Financial position — each PMO in its own terms, never summed across */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Financial position, each PMO in its own terms</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Revenue projects are judged on the margin we sold against the margin we now forecast; IT on how much of the year&rsquo;s envelope is committed, still uncommitted, or unallocated. The two are never added together.</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {(() => { const r = view.revenueFin; const st = TYPE_STYLE.revenue; const erosion = r.soldMarginPct != null && r.forecastMarginPct != null ? r.forecastMarginPct - r.soldMarginPct : null; return (
            <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
              <span className={`absolute left-0 top-0 h-full w-1.5 ${st.bar}`} />
              <div className="flex items-baseline justify-between pl-2"><span className="text-sm font-semibold" style={{ color: st.hex }}>Revenue · {r.projects} active projects</span><span className="text-xs text-muted-foreground">contract value {money(r.contractValue)}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-4 pl-2">
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Margin sold</p><p className="text-4xl font-semibold tabular-nums">{pct(r.soldMarginPct)}</p><p className="text-[11px] text-muted-foreground">as booked</p></div>
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Margin forecast</p><p className="text-4xl font-semibold tabular-nums" style={{ color: erosion == null ? undefined : erosion < -1 ? '#dc2626' : erosion > 0 ? '#059669' : undefined }}>{pct(r.forecastMarginPct)}</p><p className="text-[11px] text-muted-foreground">{erosion == null ? 'no forecast yet' : `${erosion >= 0 ? '+' : ''}${erosion.toFixed(1)} pts vs sold`}</p></div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 pl-2 text-sm">
                <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Forecast at completion</dt><dd className="font-medium tabular-nums">{r.forecastAtCompletion == null ? '—' : money(r.forecastAtCompletion)}</dd></div>
                <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Contingency consumed</dt><dd className="font-medium tabular-nums">{pct(r.contingencyConsumedPct, 0)}</dd></div>
              </dl>
              <Link href="/dashboard" className="mt-3 inline-block pl-2 text-xs font-medium hover:underline">Revenue financial position →</Link>
            </div>
          ); })()}
          {(() => { const f = view.itFin; const st = TYPE_STYLE.it; const fundable = f.envelope - f.reserve; const seg = (v: number) => fundable > 0 ? `${Math.min(100, (v / fundable) * 100)}%` : '0%'; return (
            <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
              <span className={`absolute left-0 top-0 h-full w-1.5 ${st.bar}`} />
              <div className="flex items-baseline justify-between pl-2"><span className="text-sm font-semibold" style={{ color: st.hex }}>IT · FY{f.fiscalYear} envelope</span><span className="text-xs text-muted-foreground">{money(f.envelope)} · reserve {money(f.reserve)}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-4 pl-2">
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Committed</p><p className="text-4xl font-semibold tabular-nums">{pct(f.committedPct, 0)}</p><p className="text-[11px] text-muted-foreground">{money(f.committed)} locked at Stage Gate 1</p></div>
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Capital share</p><p className="text-4xl font-semibold tabular-nums">{pct(f.capexSharePct, 0)}</p><p className="text-[11px] text-muted-foreground">of committed spend to AuC; the rest expensed</p></div>
              </div>
              <div className="mt-4 pl-2">
                <div className="flex h-5 w-full overflow-hidden rounded-md bg-muted">
                  <div className="bg-teal-600" style={{ width: seg(f.committed) }} title="Committed" />
                  <div className="bg-sky-400" style={{ width: seg(f.approvedUncommitted) }} title="Approved, not yet committed" />
                  <div className="bg-emerald-200" style={{ width: seg(f.unallocated) }} title="Unallocated" />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-teal-600" />Committed {money(f.committed)}</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />Approved, awaiting commit {money(f.approvedUncommitted)}</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />Unallocated {money(f.unallocated)}</span>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 pl-2 text-sm">
                <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Reserve drawn</dt><dd className="font-medium tabular-nums">{pct(f.reserveDrawnPct, 0)}</dd></div>
                <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Awaiting a decision</dt><dd className="font-medium tabular-nums">{awaiting}</dd></div>
              </dl>
              <Link href="/portfolio/it" className="mt-3 inline-block pl-2 text-xs font-medium hover:underline">IT funding position →</Link>
            </div>
          ); })()}
          {/* Illustrative Phase 2 / Phase 3 cards — demo data, clearly flagged */}
          <div className="relative overflow-hidden rounded-xl border border-dashed border-amber-300 bg-amber-50/20 p-5">
            <span className={`absolute left-0 top-0 h-full w-1.5 ${TYPE_STYLE.capital.bar} opacity-50`} />
            <div className="flex items-baseline justify-between pl-2"><span className="text-sm font-semibold" style={{ color: TYPE_STYLE.capital.hex }}>Capital · FY{view.fiscalYear} capital plan</span><span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-900">Phase 2 · demo data</span></div>
            <div className="mt-4 grid grid-cols-2 gap-4 pl-2">
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Plan sanctioned</p><p className="text-4xl font-semibold tabular-nums">64%</p><p className="text-[11px] text-muted-foreground">$38.4M of $60.0M under full-funds AFE</p></div>
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Spend vs re-phased plan</p><p className="text-4xl font-semibold tabular-nums">−6%</p><p className="text-[11px] text-muted-foreground">YTD cash behind the re-phased plan</p></div>
            </div>
            <div className="mt-4 pl-2">
              <div className="flex h-5 w-full overflow-hidden rounded-md bg-muted"><div className="bg-amber-500" style={{ width: '64%' }} /><div className="bg-amber-300" style={{ width: '21%' }} /><div className="bg-emerald-200" style={{ width: '15%' }} /></div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Sanctioned $38.4M</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />Study / FEED tranches $12.6M</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />Unsanctioned $9.0M</span></div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 pl-2 text-sm">
              <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Supplementary AFEs open</dt><dd className="font-medium tabular-nums">2 · $1.9M</dd></div>
              <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Commissioning this year</dt><dd className="font-medium tabular-nums">3 projects</dd></div>
            </dl>
            <p className="mt-3 pl-2 text-[11px] text-amber-900">Illustrative figures to show the shape of the Capital view; live from EcoSys and SAP PS in Phase 2.</p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-dashed border-amber-300 bg-amber-50/20 p-5">
            <span className={`absolute left-0 top-0 h-full w-1.5 ${TYPE_STYLE.rnd.bar} opacity-50`} />
            <div className="flex items-baseline justify-between pl-2"><span className="text-sm font-semibold" style={{ color: TYPE_STYLE.rnd.hex }}>R&D / NPI · FY{view.fiscalYear} pipeline</span><span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-900">Phase 3 · demo data</span></div>
            <div className="mt-4 grid grid-cols-2 gap-4 pl-2">
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Stage budgets consumed</p><p className="text-4xl font-semibold tabular-nums">58%</p><p className="text-[11px] text-muted-foreground">$14.5M of $25.0M released gate by gate</p></div>
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Launches on plan</p><p className="text-4xl font-semibold tabular-nums">4 of 5</p><p className="text-[11px] text-muted-foreground">Gate 4 this year; one slipped a quarter</p></div>
            </div>
            <div className="mt-4 pl-2">
              <div className="flex h-5 w-full overflow-hidden rounded-md bg-muted"><div className="bg-slate-400" style={{ width: '20%' }} /><div className="bg-violet-500" style={{ width: '45%' }} /><div className="bg-emerald-500" style={{ width: '25%' }} /><div className="bg-red-300" style={{ width: '10%' }} /></div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Gate 1–2 spend</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />Gate 3 development</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Gate 4 launch</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-300" />Killed (healthy)</span></div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 pl-2 text-sm">
              <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Kills this year</dt><dd className="font-medium tabular-nums">3 · $2.1M released</dd></div>
              <div className="flex justify-between border-t py-1.5"><dt className="text-muted-foreground">Engineers shared with Revenue</dt><dd className="font-medium tabular-nums">7 · 40 days attributed</dd></div>
            </dl>
            <p className="mt-3 pl-2 text-[11px] text-amber-900">Illustrative figures to show the shape of the R&D / NPI view; live from Sopheon Accolade and SAP PS in Phase 3.</p>
          </div>
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">Rule of this layer: counts, dates, states, ratios and people movement only. Money and performance indices stay inside each PMO&rsquo;s workspace and are never compared across project types.</p>
    </div>
  );
}
