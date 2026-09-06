/**
 * Cross-type layer — the thin view across PMOs (proposal §4.6, Phase 4, started
 * early with Revenue + IT). Rule enforced here by construction: it carries
 * counts, dates, states, ratios, exposures and resource movement — never
 * absolute money or performance indices compared across types.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectType } from './types';
import { PROJECT_TYPE_LABELS } from './workspace';

export interface TypeSummary {
  type: ProjectType;
  label: string;
  live: boolean;                       // false = phase not yet onboarded
  phase?: string;                      // e.g. 'Phase 2' for placeholders
  total: number;
  mix: Array<{ key: string; label: string; n: number; cls: string }>;
  attention: number;                   // items needing someone's attention
  inScope: number;                     // denominator for attention counts (Revenue: active projects only)
  inScopeLabel: string;                // e.g. 'active projects' | 'projects'
  headline: string;                    // one ratio in the type's own terms
  headlineSub: string;
  href: string;
}

export interface AttentionItem {
  type: ProjectType;
  code: string;
  name: string;
  signal: string;                      // what is wrong / needed
  detail: string;                      // measure or body
  since: string | null;                // ISO date
  tone: 'warn' | 'bad' | 'info';
  href: string;
}

export interface MovementRow {
  fromType: ProjectType;
  fromCode: string;
  person: string;
  skill: string | null;
  toLabel: string;                     // project code or 'Run / incident'
  toType: ProjectType | 'run' | 'other';
  reason: string;
  fromDate: string;
  toDate: string | null;
  days: number | null;
}

export interface RevenueFinancials {
  projects: number;               // active projects counted
  contractValue: number;          // sum of current contract value (active)
  soldMarginPct: number | null;   // (contract − as-sold budget) / contract, portfolio
  forecastMarginPct: number | null; // Σ forecast margin / Σ contract, latest snapshot per project
  forecastAtCompletion: number | null;
  contingencyConsumedPct: number | null;
}
export interface ItFinancials {
  fiscalYear: number;
  envelope: number;               // Σ allocated
  reserve: number;
  committed: number;              // baselines locked (post-commit) funded this FY
  approvedUncommitted: number;    // envelope granted, SG1 not yet
  unallocated: number;            // fundable − above the line
  committedPct: number | null;
  capexSharePct: number | null;   // weighted by committed baseline
  reserveDrawnPct: number | null;
}

export interface EnterpriseView {
  fiscalYear: number;
  revenueFin: RevenueFinancials;
  itFin: ItFinancials;
  types: TypeSummary[];
  attention: AttentionItem[];
  movements: MovementRow[];
  movementMatrix: Array<{ from: string; to: string; n: number; days: number }>;
  exposures: Array<{ type: ProjectType; label: string; ratio: number | null; sub: string }>;
  recentDecisions: Array<{ type: ProjectType; code: string | null; title: string; outcome: string; body: string; on: string }>;
}

const MIX_CLS: Record<string, string> = { proposed: 'bg-slate-400', approved: 'bg-blue-500', active: 'bg-emerald-500', on_hold: 'bg-amber-500', deferred: 'bg-slate-300', closed: 'bg-slate-200', cancelled: 'bg-red-300', sc: 'bg-sky-400' };

export async function loadEnterpriseView(sb: SupabaseClient): Promise<EnterpriseView> {
  const today = new Date();
  const fiscalYear = today.getFullYear() + 1;
  const [projRes, varRes, gdRes, recRes, dispRes, allocRes, coRes, bodyRes, fsRes] = await Promise.all([
    sb.from('projects').select('id, code, name, project_type, status, lifecycle_status, current_week, contingency, fiscal_year, fiscal_years_approved, portfolio_bucket, approved_budget_current, approved_budget_initial, contract_value_current, requested_budget, business_case, segment'),
    sb.from('variance_reports').select('project_id, report_week, cpi, spi, contingency_consumed_m').order('report_week', { ascending: false }),
    sb.from('gate_decisions').select('project_id, decision, decided_on, hold_until, gate_name, decided_by').order('decided_on', { ascending: false }).limit(300),
    sb.from('decision_records').select('project_id, project_type, decision_kind, title, status, required_body_key, decided_body_key, decided_at, proposed_at, amount, minutes').order('proposed_at', { ascending: false }).limit(200),
    sb.from('resource_displacements').select('*').order('from_date', { ascending: false }).limit(100),
    sb.from('portfolio_allocations').select('project_type, fiscal_year, bucket, allocated_amount, reserve_amount'),
    sb.from('change_orders').select('project_id, status, cost_impact_m, funding_source'),
    sb.from('decision_bodies').select('key, name'),
    sb.from('forecast_snapshots').select('project_id, period, eac, contract_value, forecast_margin').order('period', { ascending: false }),
  ]);
  type P = { id: string; code: string; name: string; project_type: ProjectType | null; status: string; lifecycle_status: string | null; current_week: number | null; contingency: number | null; fiscal_year: number | null; fiscal_years_approved: number[] | null; portfolio_bucket: string | null; approved_budget_current: number | null; approved_budget_initial: number | null; contract_value_current: number | null; requested_budget: number | null; business_case: { capex_share_pct?: number | null } | null; segment: string | null };
  const projects = ((projRes.data ?? []) as P[]).map((p) => ({ ...p, project_type: (p.project_type ?? 'revenue') as ProjectType }));
  const byId = new Map(projects.map((p) => [p.id, p]));
  const bodyName = new Map(((bodyRes.data ?? []) as Array<{ key: string; name: string }>).map((b) => [b.key, b.name]));
  const body = (k: string | null | undefined) => (k ? bodyName.get(k) ?? k.replace(/_/g, ' ').replace(':', ' — ') : '—');

  // latest variance per revenue project
  const latestVar = new Map<string, { cpi: number | null; spi: number | null; contingency_consumed_m: number | null; report_week: number }>();
  for (const v of (varRes.data ?? []) as Array<{ project_id: string; report_week: number; cpi: number | null; spi: number | null; contingency_consumed_m: number | null }>) if (!latestVar.has(v.project_id)) latestVar.set(v.project_id, v);

  const attention: AttentionItem[] = [];
  const href = (code: string, tab?: string) => `/projects/${encodeURIComponent(code)}${tab ? `?tab=${tab}` : ''}`;

  // ---- Revenue -----------------------------------------------------------
  const rev = projects.filter((p) => p.project_type === 'revenue');
  const revMix = [
    { key: 'active', label: 'Active', n: rev.filter((p) => p.status === 'Active').length, cls: MIX_CLS.active },
    { key: 'sc', label: 'Subst. complete', n: rev.filter((p) => p.status === 'SC' || p.status === 'Substantially Complete').length, cls: MIX_CLS.sc },
    { key: 'closed', label: 'Closed', n: rev.filter((p) => p.status === 'Closed').length, cls: MIX_CLS.closed },
  ].filter((m) => m.n > 0);
  let revHealthy = 0, revRated = 0;
  for (const p of rev) {
    if (p.status !== 'Active') continue;
    const v = latestVar.get(p.id); if (!v || v.cpi == null || v.spi == null) continue;
    revRated++;
    const ok = Number(v.cpi) >= 0.97 && Number(v.spi) >= 0.97; if (ok) revHealthy++;
    if (Number(v.cpi) < 0.95 || Number(v.spi) < 0.95) attention.push({ type: 'revenue', code: p.code, name: p.name, signal: Number(v.cpi) < 0.95 && Number(v.spi) < 0.95 ? 'Over cost and behind schedule' : Number(v.cpi) < 0.95 ? 'Over cost' : 'Behind schedule', detail: `CPI ${Number(v.cpi).toFixed(2)} · SPI ${Number(v.spi).toFixed(2)} · week ${v.report_week}`, since: null, tone: 'bad', href: href(p.code) });
    const cont = Number(p.contingency ?? 0), used = Number(v.contingency_consumed_m ?? 0) * 1_000_000;
    if (cont > 0 && used / cont > 0.75) attention.push({ type: 'revenue', code: p.code, name: p.name, signal: 'Contingency running down', detail: `${Math.round((used / cont) * 100)}% consumed`, since: null, tone: 'warn', href: href(p.code) });
  }

  // ---- IT ------------------------------------------------------------------
  const it = projects.filter((p) => p.project_type === 'it');
  const itMix = ['proposed', 'approved', 'active', 'on_hold', 'deferred', 'closed', 'cancelled'].map((k) => ({ key: k, label: k === 'on_hold' ? 'On hold' : k[0].toUpperCase() + k.slice(1), n: it.filter((p) => p.lifecycle_status === k).length, cls: MIX_CLS[k] })).filter((m) => m.n > 0);
  const openRecs = ((recRes.data ?? []) as Array<{ project_id: string | null; project_type: ProjectType; decision_kind: string; title: string; status: string; required_body_key: string; decided_body_key: string | null; decided_at: string | null; proposed_at: string; amount: number | null; minutes: string | null }>);
  for (const r of openRecs.filter((r) => r.status === 'proposed')) {
    const p = r.project_id ? byId.get(r.project_id) : null;
    attention.push({ type: r.project_type, code: p?.code ?? 'Portfolio', name: p?.name ?? r.title, signal: `Awaiting ${body(r.required_body_key)}`, detail: r.decision_kind.replace(/_/g, ' '), since: r.proposed_at.slice(0, 10), tone: 'info', href: p ? href(p.code, 'gates') : '/portfolio/it#decisions' });
  }
  const gds = (gdRes.data ?? []) as Array<{ project_id: string; decision: string; decided_on: string; hold_until: string | null; gate_name: string; decided_by: string }>;
  for (const p of it.filter((x) => x.lifecycle_status === 'on_hold')) {
    const h = gds.find((g) => g.project_id === p.id && g.decision === 'hold');
    const expired = h?.hold_until ? new Date(h.hold_until) < today : false;
    const soon = h?.hold_until ? new Date(h.hold_until).getTime() - today.getTime() < 30 * 86400000 : false;
    attention.push({ type: 'it', code: p.code, name: p.name, signal: expired ? 'Hold expired' : soon ? 'Hold expiring' : 'On hold', detail: h?.hold_until ? `time box ${h.hold_until}` : 'no time box', since: h?.decided_on ?? null, tone: expired ? 'bad' : 'warn', href: href(p.code, 'gates') });
  }
  for (const p of it.filter((x) => (x.lifecycle_status === 'active' || x.lifecycle_status === 'on_hold') && (x.fiscal_years_approved ?? []).length > 0 && !(x.fiscal_years_approved ?? []).includes(fiscalYear) && x.fiscal_year !== fiscalYear)) {
    attention.push({ type: 'it', code: p.code, name: p.name, signal: `FY${fiscalYear} slice not requested`, detail: `continuation due · nothing raised yet — enters the ${p.portfolio_bucket ?? 'relevant'} waterline when the PMO re-runs it`, since: null, tone: 'warn', href: href(p.code) });
  }
  const itRunning = it.filter((p) => p.lifecycle_status === 'active' || p.lifecycle_status === 'on_hold');
  const itOnTrack = itRunning.filter((p) => p.lifecycle_status === 'active').length;

  // ---- Movement ------------------------------------------------------------
  const movements: MovementRow[] = ((dispRes.data ?? []) as Array<{ from_project_id: string; to_project_id: string | null; to_project_code: string | null; resource_name: string; skill: string | null; reason: string; from_date: string; to_date: string | null; schedule_impact_days: number | null }>).map((d) => {
    const from = byId.get(d.from_project_id); const to = d.to_project_id ? byId.get(d.to_project_id) : null;
    const toType: MovementRow['toType'] = to ? to.project_type : d.to_project_code ? 'other' : 'run';
    return { fromType: from?.project_type ?? 'it', fromCode: from?.code ?? '—', person: d.resource_name, skill: d.skill, toLabel: to?.code ?? d.to_project_code ?? 'Run / incident', toType, reason: d.reason.replace(/_/g, ' '), fromDate: d.from_date, toDate: d.to_date, days: d.schedule_impact_days };
  });
  const mm = new Map<string, { from: string; to: string; n: number; days: number }>();
  for (const m of movements) {
    const to = m.toType === 'run' ? 'Run / incident' : m.toType === 'other' ? 'Other' : PROJECT_TYPE_LABELS[m.toType];
    const key = `${m.fromType}|${to}`; const cur = mm.get(key) ?? { from: PROJECT_TYPE_LABELS[m.fromType], to, n: 0, days: 0 };
    cur.n++; cur.days += m.days ?? 0; mm.set(key, cur);
  }
  for (const m of movements.filter((x) => !x.toDate)) attention.push({ type: m.fromType, code: m.fromCode, name: `${m.person}${m.skill ? ` (${m.skill})` : ''} → ${m.toLabel}`, signal: 'Person displaced', detail: m.days ? `${m.days} days attributed` : m.reason, since: m.fromDate, tone: 'warn', href: href(m.fromCode) });

  // ---- Exposures (ratios only) --------------------------------------------
  const exposures: EnterpriseView['exposures'] = [];
  const revRatios = rev.map((p) => { const v = latestVar.get(p.id); const c = Number(p.contingency ?? 0); return c > 0 && v ? Math.min(1, (Number(v.contingency_consumed_m ?? 0) * 1_000_000) / c) : null; }).filter((x): x is number => x != null);
  exposures.push({ type: 'revenue', label: 'Contingency consumed', ratio: revRatios.length ? revRatios.reduce((a, b) => a + b, 0) / revRatios.length : null, sub: `average across ${revRatios.length} projects with a contingency` });
  const allocs = ((allocRes.data ?? []) as Array<{ project_type: string; fiscal_year: number; bucket: string; allocated_amount: number; reserve_amount: number }>).filter((a) => a.project_type === 'it' && a.fiscal_year === fiscalYear);
  const reserve = allocs.reduce((n, a) => n + Number(a.reserve_amount), 0);
  const itIds = new Set(it.map((p) => p.id));
  const reserveDraws = ((coRes.data ?? []) as Array<{ project_id: string; status: string; cost_impact_m: number | null; funding_source: string | null }>).filter((c) => itIds.has(c.project_id) && c.status === 'Approved' && c.funding_source === 'bucket_reserve').reduce((n, c) => n + Number(c.cost_impact_m ?? 0) * 1_000_000, 0);
  exposures.push({ type: 'it', label: `FY${fiscalYear} reserve drawn`, ratio: reserve > 0 ? Math.min(1, reserveDraws / reserve) : null, sub: 'approved reserve-funded changes against the bucket reserves' });
  exposures.push({ type: 'it', label: 'Held or deferred share', ratio: it.length ? it.filter((p) => p.lifecycle_status === 'on_hold' || p.lifecycle_status === 'deferred').length / it.length : null, sub: 'of all IT projects this cycle' });

  // ---- Recent decisions ----------------------------------------------------
  const recentDecisions = openRecs.filter((r) => r.status !== 'proposed' && r.decided_at && !(r.status === 'withdrawn' && (r.minutes ?? '').startsWith('Superseded'))).slice(0, 12).map((r) => { const p = r.project_id ? byId.get(r.project_id) : null; return { type: r.project_type, code: p?.code ?? null, title: r.title, outcome: r.status, body: body(r.decided_body_key ?? r.required_body_key), on: (r.decided_at as string).slice(0, 10) }; });

  // ---- Financial position, each PMO in its own terms -----------------------
  const latestFs = new Map<string, { eac: number; contract_value: number; forecast_margin: number }>();
  for (const f of (fsRes.data ?? []) as Array<{ project_id: string; eac: number; contract_value: number; forecast_margin: number }>) if (!latestFs.has(f.project_id)) latestFs.set(f.project_id, f);
  const revActive = rev.filter((p) => p.status === 'Active');
  const contract = revActive.reduce((n, p) => n + Number(p.contract_value_current ?? 0), 0);
  const soldBudget = revActive.reduce((n, p) => n + Number(p.approved_budget_initial ?? 0), 0);
  const withFs = revActive.filter((p) => latestFs.has(p.id));
  const fsContract = withFs.reduce((n, p) => n + Number(latestFs.get(p.id)!.contract_value || p.contract_value_current || 0), 0);
  const fsMargin = withFs.reduce((n, p) => n + Number(latestFs.get(p.id)!.forecast_margin), 0);
  const fsEac = withFs.reduce((n, p) => n + Number(latestFs.get(p.id)!.eac), 0);
  const revenueFin: RevenueFinancials = {
    projects: revActive.length, contractValue: contract,
    soldMarginPct: contract > 0 ? ((contract - soldBudget) / contract) * 100 : null,
    forecastMarginPct: fsContract > 0 ? (fsMargin / fsContract) * 100 : null,
    forecastAtCompletion: withFs.length ? fsEac : null,
    contingencyConsumedPct: revRatios.length ? (revRatios.reduce((a, b) => a + b, 0) / revRatios.length) * 100 : null,
  };
  const envelope = allocs.reduce((n, a) => n + Number(a.allocated_amount), 0);
  const inYearIt = it.filter((p) => p.fiscal_year === fiscalYear || (p.fiscal_years_approved ?? []).includes(fiscalYear));
  const committedRows = inYearIt.filter((p) => (p.lifecycle_status === 'active' || p.lifecycle_status === 'on_hold') && Number(p.approved_budget_current) > 0);
  const committed = committedRows.reduce((n, p) => n + Number(p.approved_budget_current), 0);
  const approvedUncommitted = inYearIt.filter((p) => p.lifecycle_status === 'approved').reduce((n, p) => n + Number(p.requested_budget ?? 0), 0);
  const aboveLine = inYearIt.filter((p) => ['approved', 'active', 'on_hold'].includes(p.lifecycle_status ?? '')).reduce((n, p) => n + Number(p.lifecycle_status === 'approved' ? p.requested_budget ?? 0 : p.approved_budget_current || p.requested_budget || 0), 0);
  const capexW = committedRows.reduce((n, p) => n + Number(p.approved_budget_current) * Number(p.business_case?.capex_share_pct ?? 0) / 100, 0);
  const itFin: ItFinancials = {
    fiscalYear, envelope, reserve, committed, approvedUncommitted,
    unallocated: Math.max(0, envelope - reserve - aboveLine),
    committedPct: envelope > 0 ? (committed / envelope) * 100 : null,
    capexSharePct: committed > 0 ? (capexW / committed) * 100 : null,
    reserveDrawnPct: reserve > 0 ? (reserveDraws / reserve) * 100 : null,
  };

  const types: TypeSummary[] = [
    { type: 'revenue', label: 'Revenue', live: true, total: rev.length, mix: revMix, attention: attention.filter((a) => a.type === 'revenue').length, inScope: revActive.length, inScopeLabel: 'active projects', headline: revRated ? `${Math.round((revHealthy / revRated) * 100)}%` : '—', headlineSub: `of ${revRated} rated active projects on cost and schedule`, href: '/dashboard' },
    { type: 'it', label: 'IT', live: true, total: it.length, mix: itMix, attention: attention.filter((a) => a.type === 'it').length, inScope: it.length, inScopeLabel: 'projects', headline: itRunning.length ? `${Math.round((itOnTrack / itRunning.length) * 100)}%` : '—', headlineSub: `of ${itRunning.length} committed projects running (not held)`, href: '/portfolio/it' },
    // Illustrative placeholders until Phases 2 and 3 land — flagged as demo data in the UI.
    { type: 'capital', label: 'Capital', live: false, phase: 'Phase 2', total: 22, mix: [
      { key: 'study', label: 'FEL 1–2 study', n: 6, cls: 'bg-slate-400' }, { key: 'feed', label: 'FEED', n: 4, cls: 'bg-blue-500' }, { key: 'sanctioned', label: 'Sanctioned', n: 9, cls: 'bg-emerald-500' }, { key: 'commissioning', label: 'Commissioning', n: 3, cls: 'bg-sky-400' },
    ], attention: 4, inScope: 22, inScopeLabel: 'projects', headline: '82%', headlineSub: 'of sanctioned projects within AFE tolerance (illustrative)', href: '#' },
    { type: 'rnd', label: 'R&D / NPI', live: false, phase: 'Phase 3', total: 31, mix: [
      { key: 'g1', label: 'Gate 1–2', n: 12, cls: 'bg-slate-400' }, { key: 'g3', label: 'Gate 3 development', n: 11, cls: 'bg-violet-500' }, { key: 'g4', label: 'Gate 4 launch', n: 5, cls: 'bg-emerald-500' }, { key: 'killed', label: 'Killed this year', n: 3, cls: 'bg-red-300' },
    ], attention: 5, inScope: 31, inScopeLabel: 'projects', headline: '71%', headlineSub: 'of gates held on their planned date (illustrative)', href: '#' },
  ];
  const toneRank = { bad: 0, warn: 1, info: 2 } as const;
  attention.sort((a, b) => toneRank[a.tone] - toneRank[b.tone] || (a.since ?? '') .localeCompare(b.since ?? ''));
  return { fiscalYear, revenueFin, itFin, types, attention, movements, movementMatrix: Array.from(mm.values()), exposures, recentDecisions };
}

// ---- Governance health — how the delegation of authority is behaving ---------

export interface GovernanceHealth {
  windowDays: number;
  decided: number;
  open: number;
  approved: number;
  returned: number;
  rejected: number;
  withdrawn: number;
  medianCycleDays: number | null;            // proposed → decided
  oldestOpenDays: number | null;
  byBody: Array<{ body: string; decided: number; open: number; medianCycleDays: number | null }>;
  byKind: Array<{ kind: string; decided: number; open: number }>;
  concurrenceWaitDays: number | null;        // proposed → first Finance concurrence, median
  selfApprovals: number;                     // proposer and decider the same person (not the sponsor-contingency case)
  selfApprovalItems: Array<{ title: string; kind: string; body: string; amount: number | null; by: string; on: string }>;
  boardBelowQuorum: number;                  // board decisions recorded with fewer attendees than quorum (should be 0)
  holdsExpiredOpen: number;                  // still on hold past hold_until
  holdsWithoutTimeBox: number;
  continuationsUnrequested: number;
  displacedOpen: number;
  displacedDaysAttributed: number;
}

function median(xs: number[]): number | null { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
const days = (a: string, b: string) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86400000);

export async function loadGovernanceHealth(sb: SupabaseClient, windowDays = 90): Promise<GovernanceHealth> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const [recRes, bodyRes, gdRes, projRes, dispRes] = await Promise.all([
    sb.from('decision_records').select('id, decision_kind, status, required_body_key, decided_body_key, proposed_at, decided_at, proposed_by_role_id, decided_by_role_id, proposed_by_name, decided_by_name, title, amount, minutes, project_id, attendees, concurrences').gte('proposed_at', since).order('proposed_at', { ascending: false }),
    sb.from('decision_bodies').select('key, name, quorum'),
    sb.from('gate_decisions').select('project_id, decision, hold_until, decided_on').eq('decision', 'hold').order('decided_on', { ascending: false }),
    sb.from('projects').select('id, lifecycle_status, fiscal_year, fiscal_years_approved, project_type').neq('project_type', 'revenue'),
    sb.from('resource_displacements').select('to_date, schedule_impact_days'),
  ]);
  type R = { id: string; decision_kind: string; status: string; required_body_key: string; decided_body_key: string | null; proposed_at: string; decided_at: string | null; proposed_by_role_id: string | null; decided_by_role_id: string | null; proposed_by_name: string | null; decided_by_name: string | null; title: string; amount: number | null; minutes: string | null; project_id: string | null; attendees: string[] | null; concurrences: Array<{ body_key: string; outcome: string; at: string }> | null };
  // Duplicate requests superseded by the record actually decided are bookkeeping, not decisions — leave them out of every count.
  const recs = ((recRes.data ?? []) as R[]).filter((r) => !(r.status === 'withdrawn' && (r.minutes ?? '').startsWith('Superseded')));
  const bodies = new Map(((bodyRes.data ?? []) as Array<{ key: string; name: string; quorum: number }>).map((b) => [b.key, b]));
  const name = (k: string | null) => (k ? bodies.get(k)?.name ?? k.replace(/_/g, ' ').replace(':', ' — ') : '—');
  const decidedRecs = recs.filter((r) => r.status !== 'proposed' && r.decided_at);
  const openRecs = recs.filter((r) => r.status === 'proposed');
  const now = new Date().toISOString();
  const cycle = decidedRecs.filter((r) => r.status !== 'withdrawn').map((r) => days(r.proposed_at, r.decided_at as string));
  const groupBy = <K extends string>(key: (r: R) => K) => {
    const m = new Map<K, { decided: number; open: number; cycles: number[] }>();
    for (const r of recs) { const k = key(r); const g = m.get(k) ?? { decided: 0, open: 0, cycles: [] }; if (r.status === 'proposed') g.open++; else { g.decided++; if (r.decided_at && r.status !== 'withdrawn') g.cycles.push(days(r.proposed_at, r.decided_at)); } m.set(k, g); }
    return m;
  };
  const byBodyMap = groupBy((r) => name(r.decided_body_key ?? r.required_body_key));
  const byKindMap = groupBy((r) => r.decision_kind.replace(/_/g, ' '));
  const concWaits = recs.flatMap((r) => { const c = (r.concurrences ?? []).filter((x) => x.outcome === 'concur').sort((a, b) => (a.at < b.at ? -1 : 1))[0]; return c ? [days(r.proposed_at, c.at)] : []; });
  // Self-approval is a funding control: proposer and decider the same person on a money decision. The sponsor's own
  // project contingency and hold decisions taken directly by the matrix authority are the design working, not a breach.
  const FUNDING_KINDS = new Set(['envelope_allocation', 'waterline_approval', 'continuation', 'commit_baseline', 'change_order', 'reserve_draw', 'cancel']);
  const selfApprovalRecs = decidedRecs.filter((r) => r.status === 'approved' && FUNDING_KINDS.has(r.decision_kind) && r.proposed_by_role_id && r.proposed_by_role_id === r.decided_by_role_id && !(r.decision_kind === 'change_order' && r.required_body_key === 'sponsor'));
  const selfApprovals = selfApprovalRecs.length;
  const selfApprovalItems = selfApprovalRecs.map((r) => ({ title: r.title, kind: r.decision_kind.replace(/_/g, ' '), body: name(r.decided_body_key ?? r.required_body_key), amount: r.amount == null ? null : Number(r.amount), by: r.decided_by_name ?? r.proposed_by_name ?? 'unknown', on: (r.decided_at as string).slice(0, 10) }));
  const boardBelowQuorum = decidedRecs.filter((r) => r.status === 'approved' && (bodies.get(r.required_body_key)?.quorum ?? 1) > (r.attendees?.length ?? 0)).length;
  const projs = (projRes.data ?? []) as Array<{ id: string; lifecycle_status: string | null; fiscal_year: number | null; fiscal_years_approved: number[] | null }>;
  const holds = (gdRes.data ?? []) as Array<{ project_id: string; hold_until: string | null; decided_on: string }>;
  const onHold = projs.filter((p) => p.lifecycle_status === 'on_hold');
  const latestHold = (pid: string) => holds.find((h) => h.project_id === pid);
  const holdsExpiredOpen = onHold.filter((p) => { const h = latestHold(p.id); return h?.hold_until && new Date(h.hold_until) < new Date(); }).length;
  const holdsWithoutTimeBox = onHold.filter((p) => !latestHold(p.id)?.hold_until).length;
  const fy = new Date().getFullYear() + 1;
  const continuationsUnrequested = projs.filter((p) => (p.lifecycle_status === 'active' || p.lifecycle_status === 'on_hold') && (p.fiscal_years_approved ?? []).length > 0 && !(p.fiscal_years_approved ?? []).includes(fy) && p.fiscal_year !== fy).length;
  const disp = (dispRes.data ?? []) as Array<{ to_date: string | null; schedule_impact_days: number | null }>;
  return {
    windowDays, decided: decidedRecs.length, open: openRecs.length,
    approved: decidedRecs.filter((r) => r.status === 'approved').length, returned: decidedRecs.filter((r) => r.status === 'returned').length,
    rejected: decidedRecs.filter((r) => r.status === 'rejected').length, withdrawn: decidedRecs.filter((r) => r.status === 'withdrawn').length,
    medianCycleDays: median(cycle), oldestOpenDays: openRecs.length ? Math.max(...openRecs.map((r) => days(r.proposed_at, now))) : null,
    byBody: Array.from(byBodyMap.entries()).map(([body, g]) => ({ body, decided: g.decided, open: g.open, medianCycleDays: median(g.cycles) })).sort((a, b) => b.decided + b.open - (a.decided + a.open)),
    byKind: Array.from(byKindMap.entries()).map(([kind, g]) => ({ kind, decided: g.decided, open: g.open })),
    concurrenceWaitDays: median(concWaits), selfApprovals, selfApprovalItems, boardBelowQuorum, holdsExpiredOpen, holdsWithoutTimeBox, continuationsUnrequested,
    displacedOpen: disp.filter((d) => !d.to_date).length, displacedDaysAttributed: disp.reduce((n, d) => n + (d.schedule_impact_days ?? 0), 0),
  };
}

/** Markdown grounding for the executive agents — the same facts the Enterprise page shows, plus governance health. */
export async function loadEnterpriseState(sb: SupabaseClient): Promise<string> {
  const [v, h] = await Promise.all([loadEnterpriseView(sb), loadGovernanceHealth(sb)]);
  const m = (n: number) => { const a = Math.abs(n); return a >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : a >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`; };
  const p = (x: number | null, dp = 1) => (x == null ? '—' : `${x.toFixed(dp)}%`);
  const L: string[] = [];
  L.push(`# Enterprise portfolio data — LIVE and AUTHORITATIVE · as of ${new Date().toISOString().slice(0, 10)} · next fiscal year FY${v.fiscalYear}`);
  L.push('');
  L.push('RULE OF THIS LAYER: state each PMO in its own terms. Never add, rank or compare money or performance indices across project types. Capital and R&D / NPI are NOT live — any figures shown for them in the app are illustrative placeholders; say "not yet on the platform" for them.');
  L.push('');
  L.push('## PMOs on the platform');
  for (const t of v.types) {
    if (!t.live) { L.push(`- ${t.label}: not yet on the platform (${t.phase}). Will bring ${t.headlineSub.replace(' (illustrative)', '')}.`); continue; }
    L.push(`- ${t.label}: ${t.total} projects · mix ${t.mix.map((x) => `${x.label} ${x.n}`).join(', ')} · ${t.attention} of ${t.inScope} ${t.inScopeLabel} need attention · health in own terms: ${t.headline} ${t.headlineSub}`);
  }
  L.push('');
  L.push('## Revenue — financial position (own terms)');
  const r = v.revenueFin;
  L.push(`- ${r.projects} active projects · contract value ${m(r.contractValue)} · margin sold ${p(r.soldMarginPct)} · margin forecast ${p(r.forecastMarginPct)}${r.soldMarginPct != null && r.forecastMarginPct != null ? ` (${(r.forecastMarginPct - r.soldMarginPct).toFixed(1)} pts vs sold)` : ''} · forecast at completion ${r.forecastAtCompletion == null ? '—' : m(r.forecastAtCompletion)} · contingency consumed ${p(r.contingencyConsumedPct, 0)} (average)`);
  L.push('');
  L.push(`## IT — funding position FY${v.itFin.fiscalYear} (own terms)`);
  const f = v.itFin;
  L.push(`- envelope ${m(f.envelope)} · reserve ${m(f.reserve)} · committed at SG1 ${m(f.committed)} (${p(f.committedPct, 0)} of envelope) · approved awaiting commit ${m(f.approvedUncommitted)} · unallocated ${m(f.unallocated)} · capital share of committed ${p(f.capexSharePct, 0)} · reserve drawn ${p(f.reserveDrawnPct, 0)}`);
  L.push('');
  L.push('## What needs attention — counts by signal');
  for (const t of v.types.filter((x) => x.live)) {
    const items = v.attention.filter((a) => a.type === t.type);
    const g = Array.from(items.reduce((mm, a) => mm.set(a.signal, (mm.get(a.signal) ?? 0) + 1), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);
    L.push(`- ${t.label} (${items.length} of ${t.inScope} ${t.inScopeLabel}): ${g.map(([s, n]) => `${n} ${s}`).join(' · ') || 'nothing flagged'}`);
  }
  L.push('');
  L.push('## Attention detail (for clustering — do NOT list these one by one in an executive brief; group them)');
  L.push('| PMO | project | signal | measure | since |');
  L.push('|---|---|---|---|---|');
  for (const a of v.attention.slice(0, 60)) L.push(`| ${a.type} | ${a.code} · ${a.name} | ${a.signal} | ${a.detail} | ${a.since ?? ''} |`);
  L.push('');
  L.push('## People moved off projects');
  L.push(`- ${v.movements.filter((x) => !x.toDate).length} currently displaced · ${v.movements.reduce((n, x) => n + (x.days ?? 0), 0)} schedule days attributed · ${v.movementMatrix.map((x) => `${x.from} → ${x.to}: ${x.n} (${x.days} days)`).join('; ') || 'none'}`);
  L.push('');
  L.push(`## Governance health — last ${h.windowDays} days (decision records)`);
  L.push(`- ${h.decided} decided (${h.approved} approved, ${h.returned} returned, ${h.rejected} rejected, ${h.withdrawn} withdrawn) · ${h.open} open · median cycle proposed→decided ${h.medianCycleDays == null ? '—' : `${h.medianCycleDays.toFixed(1)} days`} · oldest open ${h.oldestOpenDays == null ? '—' : `${h.oldestOpenDays.toFixed(0)} days`}`);
  L.push(`- Finance concurrence: median wait ${h.concurrenceWaitDays == null ? '—' : `${h.concurrenceWaitDays.toFixed(1)} days`}`);
  L.push(`- Controls: self-approvals (proposer = decider on a funding decision; sponsor's own contingency and holds excluded) ${h.selfApprovals} · board approvals below quorum ${h.boardBelowQuorum} · holds past their time box ${h.holdsExpiredOpen} · holds without a time box ${h.holdsWithoutTimeBox} · running projects with next-year slice not requested ${h.continuationsUnrequested}`);
  if (h.selfApprovalItems.length) L.push('- Self-approvals, named: ' + h.selfApprovalItems.map((x) => `${x.on} · ${x.kind} · "${x.title}"${x.amount != null ? ` · $${Math.round(x.amount).toLocaleString('en-US')}` : ''} · proposed and approved by ${x.by} acting as ${x.body}`).join('; '));
  L.push('- By body: ' + (h.byBody.map((b) => `${b.body}: ${b.decided} decided, ${b.open} open${b.medianCycleDays != null ? `, median ${b.medianCycleDays.toFixed(1)} d` : ''}`).join(' · ') || 'none'));
  L.push('- By kind: ' + (h.byKind.map((k) => `${k.kind}: ${k.decided} decided, ${k.open} open`).join(' · ') || 'none'));
  L.push('');
  L.push('## Recent decisions (who decided what)');
  for (const d of v.recentDecisions.slice(0, 15)) L.push(`- ${d.on} · ${d.type} · ${d.code ?? 'portfolio'} · ${d.title} → ${d.outcome} by ${d.body}`);
  return L.join('\n');
}
