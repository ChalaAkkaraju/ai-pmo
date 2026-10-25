/**
 * Capital workspace domain helpers (migration 0051) — shared by the
 * /portfolio/capital page, the project page, the capital intake, the agent
 * context and the seed, so the vocabulary and the arithmetic never drift.
 * Pure functions first; the two loaders at the bottom only read.
 *
 * The capital process:
 *   • Front-end loading spends small study budgets (FEL1 Appraise, FEL2
 *     Select) to buy down uncertainty, then sanctions the AFE — the full
 *     appropriation — at the end of FEL3. The AFE is the commit gate.
 *   • A forecast more than 10% over the AFE needs a SUPPLEMENTARY AFE, which is
 *     a new sanction event routed on the revised total, never an edit.
 *   • Spend builds an asset. The money question is therefore the chain
 *         Appropriated (AFE) -> Committed -> Actual -> Settled to AuC -> Capitalised
 *     and every capital control failure lives in a gap between two links.
 *   • Settlement (WBS -> AuC -> fixed asset) is READ from SAP PS. This module
 *     never re-derives what SAP posted; it checks READINESS ahead of the
 *     in-service date, because a settlement rule found missing at year end
 *     moves depreciation into the next fiscal year.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BusinessCase, GateDecision, PortfolioAllocation, SanctionEvent, StageTemplate } from './types';
import { isCommitted, stageAt } from './stage-gates';

// ---- vocabulary ------------------------------------------------------------

export const CAPITAL_BUCKETS = ['growth', 'sustaining', 'hse_regulatory', 'cost_reduction'] as const;
export type CapitalBucket = (typeof CAPITAL_BUCKETS)[number];

export const CAPITAL_BUCKET_LABELS: Record<string, string> = {
  growth: 'Growth',
  sustaining: 'Sustaining',
  hse_regulatory: 'HSE & regulatory',
  cost_reduction: 'Cost reduction',
};

export const CAPITAL_BUCKET_STYLE: Record<string, { hex: string; accentBar: string; text: string; soft: string }> = {
  growth: { hex: '#2563eb', accentBar: 'bg-blue-600', text: 'text-blue-700', soft: 'bg-blue-50' },
  sustaining: { hex: '#0d9488', accentBar: 'bg-teal-600', text: 'text-teal-700', soft: 'bg-teal-50' },
  hse_regulatory: { hex: '#d97706', accentBar: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50' },
  cost_reduction: { hex: '#7c3aed', accentBar: 'bg-violet-600', text: 'text-violet-700', soft: 'bg-violet-50' },
};

export function capitalBucketStyle(b: string | null | undefined) {
  const s = CAPITAL_BUCKET_STYLE[b ?? ''] ?? { hex: '#64748b', accentBar: 'bg-slate-400', text: 'text-slate-700', soft: 'bg-slate-50' };
  return { ...s, label: capitalBucketLabel(b) };
}
export function capitalBucketLabel(b: string | null | undefined): string {
  return CAPITAL_BUCKET_LABELS[b ?? ''] ?? (b ? b.replace(/_/g, ' ') : 'Unassigned');
}

export const CAPITAL_CATEGORY_LABELS: Record<string, string> = {
  major: 'Major project (FEL)',
  minor: 'Minor project',
};
export function capitalCategoryLabel(c: string | null | undefined): string {
  return CAPITAL_CATEGORY_LABELS[c ?? ''] ?? (c ?? '—');
}

/** Supplementary AFE tolerance: a forecast more than this % over the AFE needs one. */
export const SUPPLEMENTARY_TOLERANCE_PCT = 10;
/** Delegation bands for display. The matrix in the database is the authority. */
export const AFE_BANDS = [
  { max: 1_000_000, body: 'plant_manager', label: 'Plant manager' },
  { max: 10_000_000, body: 'bu_head', label: 'Business unit head' },
  { max: Infinity, body: 'capital_committee', label: 'Capital committee' },
] as const;
export function afeAuthority(amount: number): { body: string; label: string } {
  const b = AFE_BANDS.find((x) => amount < x.max) ?? AFE_BANDS[AFE_BANDS.length - 1];
  return { body: b.body, label: b.label };
}

export function capitalBodyColour(key: string): string {
  return ({ capital_committee: '#0f172a', bu_head: '#2563eb', plant_manager: '#0d9488', finance: '#d97706' } as Record<string, string>)[key] ?? '#64748b';
}

export function fmtMoneyCap(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// ---- the case -----------------------------------------------------------------

/** The capex test as answered at intake: does the spend create or extend an asset? */
export interface CapexTest {
  new_asset: boolean;
  extends_life: boolean;
  adds_capacity: boolean;
  /** Repair / maintenance that restores the asset to its original condition — always opex. */
  like_for_like_repair: boolean;
}

/**
 * The capital business case. Stored in projects.business_case (jsonb) beside
 * the shared fields, so cross-type views that read the shared fields keep
 * working; these are the fields only the capital workspace reads.
 */
export interface CapitalCase extends BusinessCase {
  site?: string | null;
  asset_class?: string | null;
  useful_life_years?: number | null;
  npv?: number | null;
  irr_pct?: number | null;
  /** Estimate class of the current estimate: 5 (order of magnitude) … 1 (definitive). */
  estimate_class?: number | null;
  /** Current forecast at completion — the number tested against the AFE. */
  eac?: number | null;
  /** The in-service date as approved at the AFE. */
  planned_in_service_date?: string | null;
  /** The current forecast in-service date. */
  in_service_date?: string | null;
  /** Share of spend Finance expects to expense (training, demolition, studies, write-offs). */
  expected_expense_pct?: number | null;
  capex_test?: CapexTest | null;
}

export function asCapitalCase(bc: unknown): CapitalCase {
  return (bc ?? {}) as CapitalCase;
}

/**
 * The capex / opex test, IAS 16 style. Spend capitalises when it brings a new
 * asset into use, extends an existing asset's life, or adds capacity or
 * capability; spend that restores an asset to its original condition is
 * maintenance and is expensed, whatever its size. A project can be mixed —
 * a line replacement with demolition and training carries both.
 */
export function capexVerdict(t: CapexTest | null | undefined): { verdict: 'capex' | 'opex' | 'mixed' | 'unanswered'; reason: string } {
  if (!t) return { verdict: 'unanswered', reason: 'The capex test has not been answered — Finance cannot concur on the classification without it.' };
  const qualifies = t.new_asset || t.extends_life || t.adds_capacity;
  if (qualifies && t.like_for_like_repair) return { verdict: 'mixed', reason: 'Part of the scope creates or improves an asset and part restores existing condition: the restoring part is expensed. Settlement rules must split it.' };
  if (qualifies) return { verdict: 'capex', reason: `Capitalisable: ${[t.new_asset && 'new asset', t.extends_life && 'extends useful life', t.adds_capacity && 'adds capacity or capability'].filter(Boolean).join(', ')}.` };
  if (t.like_for_like_repair) return { verdict: 'opex', reason: 'Restores the asset to its original condition — maintenance, expensed. This does not belong in the capital envelope.' };
  return { verdict: 'opex', reason: 'None of the capitalisation tests is met — the spend is expensed.' };
}

// ---- the asset chain ----------------------------------------------------------

export interface CostRow { wbs_code: string; period: string; actual_cost: number; commitment: number }
export interface SettlementRule { wbs_code: string; receiver_type: 'auc' | 'fixed_asset' | 'cost_centre'; receiver_id: string; percent: number }
export interface SettlementRow { wbs_code: string; period: string; settled_to_auc: number; capitalised_to_fa: number; expensed: number }
export interface AssetRow { asset_number: string; description: string; asset_class: string | null; useful_life_years: number | null; acquisition_value: number; capitalisation_date: string | null; status: 'auc' | 'capitalised' | 'retired' }
export interface WbsRow { wbs_code: string; parent_wbs_code: string | null; name: string; budget_bac: number | null }

export interface AssetChain {
  afe_original: number;
  supplementary: number;
  /** Appropriated = original AFE + approved supplementaries. */
  appropriated: number;
  actual: number;
  /** Open commitment (POs not yet received) at the latest period per WBS. */
  open_commitment: number;
  /** Committed = actual + open commitment. */
  committed: number;
  settled_to_auc: number;
  capitalised: number;
  expensed: number;
  /** Actual cost not yet settled anywhere (to AuC or to expense). */
  unsettled: number;
  /** Sitting in assets under construction, not yet capitalised. */
  auc_balance: number;
}

export function assetChain(sanctions: Pick<SanctionEvent, 'kind' | 'amount'>[], costs: CostRow[], settlements: SettlementRow[]): AssetChain {
  const afe_original = sanctions.filter((s) => s.kind === 'afe').reduce((n, s) => n + Number(s.amount), 0);
  const supplementary = sanctions.filter((s) => s.kind === 'supplementary_afe').reduce((n, s) => n + Number(s.amount), 0);
  const actual = costs.reduce((n, c) => n + Number(c.actual_cost), 0);
  const latest = new Map<string, CostRow>();
  for (const c of costs) { const cur = latest.get(c.wbs_code); if (!cur || cur.period < c.period) latest.set(c.wbs_code, c); }
  const open_commitment = Array.from(latest.values()).reduce((n, c) => n + Number(c.commitment), 0);
  const settled_to_auc = settlements.reduce((n, s) => n + Number(s.settled_to_auc), 0);
  const capitalised = settlements.reduce((n, s) => n + Number(s.capitalised_to_fa), 0);
  const expensed = settlements.reduce((n, s) => n + Number(s.expensed), 0);
  return {
    afe_original, supplementary, appropriated: afe_original + supplementary,
    actual, open_commitment, committed: actual + open_commitment,
    settled_to_auc, capitalised, expensed,
    unsettled: Math.max(0, actual - settled_to_auc - expensed),
    auc_balance: Math.max(0, settled_to_auc - capitalised),
  };
}

/** Sum chains for the portfolio (one PMO, one currency — safe to add). */
export function sumChains(chains: AssetChain[]): AssetChain {
  const z: AssetChain = { afe_original: 0, supplementary: 0, appropriated: 0, actual: 0, open_commitment: 0, committed: 0, settled_to_auc: 0, capitalised: 0, expensed: 0, unsettled: 0, auc_balance: 0 };
  for (const c of chains) for (const k of Object.keys(z) as Array<keyof AssetChain>) z[k] += c[k];
  return z;
}

// ---- supplementary AFE trigger ------------------------------------------------

export interface SupplementaryTrigger {
  needed: boolean;
  over_pct: number | null;
  over_amount: number;
  /** The revised total AFE a supplementary would ask for (= EAC). */
  revised_total: number;
  /** Whether the revised total crosses into a higher approval authority. */
  crosses_authority: boolean;
  authority_now: string;
  authority_revised: string;
}

export function supplementaryTrigger(appropriated: number, eac: number | null | undefined): SupplementaryTrigger {
  const e = Number(eac ?? 0);
  const over = e - appropriated;
  const pct = appropriated > 0 && e > 0 ? (over / appropriated) * 100 : null;
  const now = afeAuthority(appropriated), rev = afeAuthority(Math.max(e, appropriated));
  return {
    needed: pct !== null && pct > SUPPLEMENTARY_TOLERANCE_PCT,
    over_pct: pct === null ? null : Math.round(pct * 10) / 10,
    over_amount: over,
    revised_total: Math.max(e, appropriated),
    crosses_authority: now.body !== rev.body,
    authority_now: now.label,
    authority_revised: rev.label,
  };
}

// ---- settlement readiness -----------------------------------------------------

export type ReadinessSeverity = 'block' | 'warn' | 'info';
export interface ReadinessFinding {
  key: string;
  severity: ReadinessSeverity;
  title: string;
  detail: string;
  wbs?: string[];
  amount?: number;
}

export interface ReadinessInput {
  committed: boolean;
  lifecycle: string | null;
  case: CapitalCase;
  chain: AssetChain;
  wbs: WbsRow[];
  costs: CostRow[];
  rules: SettlementRule[];
  settlements: SettlementRow[];
  assets: AssetRow[];
  /** Is a supplementary AFE already open or approved for the current overrun? */
  supplementaryOpen: boolean;
  today?: Date;
}

const DAY = 86_400_000;

/**
 * Settlement readiness — the checks Finance would otherwise run by hand in
 * December. Each finding names the WBS elements and the money involved so it
 * can be acted on, not just noticed. Ordered most-serious first.
 */
export function settlementReadiness(i: ReadinessInput): ReadinessFinding[] {
  const out: ReadinessFinding[] = [];
  const today = i.today ?? new Date();
  const bc = i.case;
  const ruleSum = new Map<string, number>();
  for (const r of i.rules) ruleSum.set(r.wbs_code, (ruleSum.get(r.wbs_code) ?? 0) + Number(r.percent));
  const costBy = new Map<string, number>();
  for (const c of i.costs) costBy.set(c.wbs_code, (costBy.get(c.wbs_code) ?? 0) + Number(c.actual_cost));
  const costBearing = Array.from(costBy.entries()).filter(([, v]) => v > 0).map(([k]) => k);
  const inService = bc.in_service_date ? new Date(`${bc.in_service_date}T00:00:00Z`) : null;
  const daysToService = inService ? Math.round((inService.getTime() - today.getTime()) / DAY) : null;
  const closed = i.lifecycle === 'closed' || i.lifecycle === 'cancelled';

  // 1. Cost on a WBS element with no settlement rule.
  const noRule = costBearing.filter((w) => !ruleSum.has(w));
  if (i.committed && noRule.length) {
    const amt = noRule.reduce((n, w) => n + (costBy.get(w) ?? 0), 0);
    const near = daysToService !== null && daysToService <= 90;
    out.push({
      key: 'no_rule', severity: near ? 'block' : 'warn',
      title: `${noRule.length} WBS element${noRule.length === 1 ? '' : 's'} carrying cost with no settlement rule`,
      detail: `${fmtMoneyCap(amt)} cannot settle to AuC until Finance sets a rule${near ? ` — and the in-service date is ${daysToService} days away, so it will miss capitalisation` : ''}.`,
      wbs: noRule, amount: amt,
    });
  }
  // 2. Rules that do not add up to 100%.
  const bad = Array.from(ruleSum.entries()).filter(([, p]) => Math.abs(p - 100) > 0.01);
  if (bad.length) {
    out.push({
      key: 'rule_sum', severity: 'warn',
      title: `Settlement rules do not total 100% on ${bad.length} element${bad.length === 1 ? '' : 's'}`,
      detail: bad.map(([w, p]) => `${w} at ${p}%`).join(' · ') + ' — the remainder stays on the WBS and has to be found by hand at period close.',
      wbs: bad.map(([w]) => w),
    });
  }
  // 3. In-service slipping into the next fiscal year (depreciation start moves a year).
  if (bc.planned_in_service_date && bc.in_service_date && !closed) {
    const py = Number(bc.planned_in_service_date.slice(0, 4)), cy = Number(bc.in_service_date.slice(0, 4));
    if (cy > py) {
      out.push({
        key: 'fy_slip', severity: 'warn',
        title: `In-service has slipped into FY${cy}`,
        detail: `Approved for ${fmtDate(bc.planned_in_service_date)}, now forecast ${fmtDate(bc.in_service_date)}. Depreciation starts a fiscal year later than the AFE assumed, and the FY${py} capital plan carries an asset that will not exist.`,
      });
    }
  }
  // 4. In service but not capitalised: AuC ageing.
  if (inService && daysToService !== null && daysToService < 0 && i.chain.auc_balance > 0) {
    const ageDays = -daysToService;
    out.push({
      key: 'auc_ageing', severity: ageDays > 90 ? 'block' : 'warn',
      title: `In service ${ageDays} days, ${fmtMoneyCap(i.chain.auc_balance)} still in AuC`,
      detail: 'The asset is running but not on the register, so it is not depreciating. Final settlement to fixed assets is overdue.',
      amount: i.chain.auc_balance,
    });
  }
  // 5. In service soon with no asset master created.
  if (i.committed && daysToService !== null && daysToService >= 0 && daysToService <= 90 && i.assets.length === 0) {
    out.push({
      key: 'no_asset', severity: 'warn',
      title: `In service in ${daysToService} days and no fixed-asset record created`,
      detail: 'Final settlement needs the asset numbers, classes and useful lives. Create them before handover, not after.',
    });
  }
  // 6. Expensed share above what Finance expected at the AFE.
  const settledTotal = i.chain.settled_to_auc + i.chain.expensed;
  if (settledTotal > 0) {
    const share = (i.chain.expensed / settledTotal) * 100;
    const expected = Number(bc.expected_expense_pct ?? 10);
    if (share > expected + 5) {
      out.push({
        key: 'expense_share', severity: 'warn',
        title: `${share.toFixed(0)}% of settled cost expensed — the AFE assumed ${expected}%`,
        detail: `${fmtMoneyCap(i.chain.expensed)} has gone to the P&L instead of the asset. Either the scope has drifted toward maintenance or the settlement rules are wrong; both need Finance.`,
        amount: i.chain.expensed,
      });
    }
  }
  // 7. Forecast over the AFE by more than the tolerance, with no supplementary raised.
  const trig = supplementaryTrigger(i.chain.appropriated, bc.eac ?? null);
  if (i.committed && trig.needed && !i.supplementaryOpen && !closed) {
    out.push({
      key: 'supplementary', severity: 'block',
      title: `Forecast ${trig.over_pct}% over the AFE — a supplementary AFE is required`,
      detail: `EAC ${fmtMoneyCap(bc.eac)} against ${fmtMoneyCap(i.chain.appropriated)} appropriated. Spending past the AFE without one is unauthorised.${trig.crosses_authority ? ` The revised total moves the approval from the ${trig.authority_now.toLowerCase()} to the ${trig.authority_revised.toLowerCase()}.` : ''}`,
      amount: trig.over_amount,
    });
  }
  // 8. Actual cost not yet settled (informative: a period-close lag is normal, a large one is not).
  // Before the AFE, study spend legitimately waits on the WBS until the project is sanctioned or stopped.
  if (i.committed && i.chain.unsettled > 0 && i.chain.actual > 0 && i.chain.unsettled / i.chain.actual > 0.15) {
    out.push({
      key: 'unsettled', severity: 'info',
      title: `${fmtMoneyCap(i.chain.unsettled)} of actual cost not yet settled`,
      detail: `${Math.round((i.chain.unsettled / i.chain.actual) * 100)}% of spend is sitting on the WBS. More than one period of lag usually means a missing rule rather than timing.`,
      amount: i.chain.unsettled,
    });
  }
  const rank = { block: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// ---- per-project view ---------------------------------------------------------

export interface CapitalProjectData {
  template: StageTemplate | null;
  decisions: GateDecision[];
  sanctions: SanctionEvent[];
  wbs: WbsRow[];
  costs: CostRow[];
  rules: SettlementRule[];
  settlements: SettlementRow[];
  assets: AssetRow[];
  openSupplementary: boolean;
}

export async function loadCapitalProjectData(sb: SupabaseClient, project: { id: string; stage_template_id: string | null }): Promise<CapitalProjectData> {
  const [tpl, dec, se, wbs, cost, rules, sett, assets, recs] = await Promise.all([
    project.stage_template_id ? sb.from('stage_templates').select('*').eq('id', project.stage_template_id).maybeSingle() : Promise.resolve({ data: null }),
    sb.from('gate_decisions').select('*').eq('project_id', project.id).order('decided_on'),
    sb.from('sanction_events').select('*').eq('project_id', project.id).order('authorised_on'),
    sb.from('work_packages').select('wbs_code, parent_wbs_code, name, budget_bac').eq('project_id', project.id).order('wbs_code'),
    sb.from('cost_actuals').select('wbs_code, period, actual_cost, commitment').eq('project_id', project.id),
    sb.from('capital_settlement_rules').select('wbs_code, receiver_type, receiver_id, percent').eq('project_id', project.id),
    sb.from('capital_settlements').select('wbs_code, period, settled_to_auc, capitalised_to_fa, expensed').eq('project_id', project.id),
    sb.from('capital_assets').select('asset_number, description, asset_class, useful_life_years, acquisition_value, capitalisation_date, status').eq('project_id', project.id),
    sb.from('decision_records').select('id').eq('project_id', project.id).eq('decision_kind', 'supplementary_afe').eq('status', 'proposed'),
  ]);
  return {
    template: (tpl.data as StageTemplate | null) ?? null,
    decisions: (dec.data ?? []) as GateDecision[],
    sanctions: (se.data ?? []) as SanctionEvent[],
    wbs: (wbs.data ?? []) as WbsRow[],
    costs: (cost.data ?? []) as CostRow[],
    rules: (rules.data ?? []) as SettlementRule[],
    settlements: (sett.data ?? []) as SettlementRow[],
    assets: (assets.data ?? []) as AssetRow[],
    openSupplementary: (recs.data ?? []).length > 0,
  };
}

/** The same data for many projects in nine queries rather than nine per project. */
export async function loadCapitalPortfolioData(sb: SupabaseClient, projects: Array<{ id: string; stage_template_id: string | null }>): Promise<Map<string, CapitalProjectData>> {
  const ids = projects.map((p) => p.id);
  const out = new Map<string, CapitalProjectData>();
  if (ids.length === 0) return out;
  const [tpl, dec, se, wbs, cost, rules, sett, assets, recs] = await Promise.all([
    sb.from('stage_templates').select('*').eq('project_type', 'capital'),
    sb.from('gate_decisions').select('*').in('project_id', ids).order('decided_on'),
    sb.from('sanction_events').select('*').in('project_id', ids).order('authorised_on'),
    sb.from('work_packages').select('project_id, wbs_code, parent_wbs_code, name, budget_bac').in('project_id', ids).order('wbs_code'),
    sb.from('cost_actuals').select('project_id, wbs_code, period, actual_cost, commitment').in('project_id', ids).limit(20000),
    sb.from('capital_settlement_rules').select('project_id, wbs_code, receiver_type, receiver_id, percent').in('project_id', ids),
    sb.from('capital_settlements').select('project_id, wbs_code, period, settled_to_auc, capitalised_to_fa, expensed').in('project_id', ids).limit(20000),
    sb.from('capital_assets').select('project_id, asset_number, description, asset_class, useful_life_years, acquisition_value, capitalisation_date, status').in('project_id', ids),
    sb.from('decision_records').select('project_id').in('project_id', ids).eq('decision_kind', 'supplementary_afe').eq('status', 'proposed'),
  ]);
  const templates = (tpl.data ?? []) as StageTemplate[];
  const group = <T extends { project_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) (m.get(r.project_id) ?? m.set(r.project_id, []).get(r.project_id)!).push(r);
    return m;
  };
  const g = {
    dec: group(dec.data as Array<GateDecision & { project_id: string }>), se: group(se.data as Array<SanctionEvent & { project_id: string }>),
    wbs: group(wbs.data as Array<WbsRow & { project_id: string }>), cost: group(cost.data as Array<CostRow & { project_id: string }>),
    rules: group(rules.data as Array<SettlementRule & { project_id: string }>), sett: group(sett.data as Array<SettlementRow & { project_id: string }>),
    assets: group(assets.data as Array<AssetRow & { project_id: string }>),
  };
  const openSupp = new Set(((recs.data ?? []) as Array<{ project_id: string }>).map((r) => r.project_id));
  for (const p of projects) {
    out.set(p.id, {
      template: templates.find((t) => t.id === p.stage_template_id) ?? null,
      decisions: g.dec.get(p.id) ?? [], sanctions: g.se.get(p.id) ?? [], wbs: g.wbs.get(p.id) ?? [], costs: g.cost.get(p.id) ?? [],
      rules: g.rules.get(p.id) ?? [], settlements: g.sett.get(p.id) ?? [], assets: g.assets.get(p.id) ?? [], openSupplementary: openSupp.has(p.id),
    });
  }
  return out;
}

export interface CapitalProjectView {
  chain: AssetChain;
  findings: ReadinessFinding[];
  trigger: SupplementaryTrigger;
  committed: boolean;
  stageName: string | null;
  gateName: string | null;
  isCommitStage: boolean;
  /** Study money released before the AFE (gate_budget sanction events). */
  studyReleased: number;
}

export function capitalProjectView(project: { lifecycle_status: string | null; current_stage: number | null; business_case: unknown }, d: CapitalProjectData, today?: Date): CapitalProjectView {
  const bc = asCapitalCase(project.business_case);
  const chain = assetChain(d.sanctions, d.costs, d.settlements);
  const committed = isCommitted(d.template, d.decisions) || chain.afe_original > 0;
  const st = stageAt(d.template, project.current_stage ?? 0);
  // A supplementary already approved for this overrun also satisfies the trigger.
  const trigger = supplementaryTrigger(chain.appropriated, bc.eac ?? null);
  const findings = settlementReadiness({
    committed, lifecycle: project.lifecycle_status, case: bc, chain, wbs: d.wbs, costs: d.costs, rules: d.rules,
    settlements: d.settlements, assets: d.assets, supplementaryOpen: d.openSupplementary, today,
  });
  return {
    chain, findings, trigger, committed,
    stageName: st?.name ?? null, gateName: st?.gate_name ?? null, isCommitStage: Boolean(st?.is_commit),
    studyReleased: d.sanctions.filter((s) => s.kind === 'gate_budget').reduce((n, s) => n + Number(s.amount), 0),
  };
}

// ---- agent grounding ----------------------------------------------------------

/** Markdown for one capital project, appended to the gate state for project-scope agent calls. */
export function capitalProjectMarkdown(p: { code: string; name: string; lifecycle_status: string | null; business_case: unknown }, d: CapitalProjectData, v: CapitalProjectView): string {
  const bc = asCapitalCase(p.business_case);
  const c = v.chain;
  const L: string[] = [];
  L.push(`# Capital state — ${p.code} ${p.name} (LIVE, read from SAP PS / FI-AA mirrors)`);
  L.push('');
  L.push(`- Site: ${bc.site ?? '—'} · asset class: ${bc.asset_class ?? '—'} · useful life ${bc.useful_life_years ?? '—'} years · estimate class ${bc.estimate_class ?? '—'}`);
  L.push(`- Case: NPV ${fmtMoneyCap(bc.npv)} · IRR ${bc.irr_pct ?? '—'}% · payback ${bc.payback_months ?? '—'} months · expected expensed share ${bc.expected_expense_pct ?? 10}%`);
  const cv = capexVerdict(bc.capex_test);
  L.push(`- Capex test: ${cv.verdict.toUpperCase()} — ${cv.reason}`);
  L.push(`- In-service: approved ${bc.planned_in_service_date ?? '—'} · forecast ${bc.in_service_date ?? '—'}`);
  L.push(`- Stage: ${v.stageName ?? '—'} (gate "${v.gateName ?? '—'}"${v.isCommitStage ? ', the AFE commit gate' : ''}) · AFE sanctioned: ${v.committed ? 'yes' : 'no'} · FEL study money released: ${fmtMoneyCap(v.studyReleased)}`);
  L.push('');
  L.push('## Asset chain');
  L.push('| Appropriated (AFE + supp.) | Committed | Actual | Settled to AuC | Capitalised | Expensed | Unsettled | AuC balance | EAC |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  L.push(`| ${fmtMoneyCap(c.appropriated)} (${fmtMoneyCap(c.afe_original)} + ${fmtMoneyCap(c.supplementary)}) | ${fmtMoneyCap(c.committed)} | ${fmtMoneyCap(c.actual)} | ${fmtMoneyCap(c.settled_to_auc)} | ${fmtMoneyCap(c.capitalised)} | ${fmtMoneyCap(c.expensed)} | ${fmtMoneyCap(c.unsettled)} | ${fmtMoneyCap(c.auc_balance)} | ${fmtMoneyCap(bc.eac)} |`);
  L.push(`- Supplementary trigger (tolerance ${SUPPLEMENTARY_TOLERANCE_PCT}%): EAC ${v.trigger.over_pct ?? '—'}% vs appropriated → ${v.trigger.needed ? 'REQUIRED' : 'not required'}${v.trigger.needed ? ` · revised total ${fmtMoneyCap(v.trigger.revised_total)} · authority ${v.trigger.authority_now} → ${v.trigger.authority_revised}` : ''} · supplementary already open: ${d.openSupplementary ? 'yes' : 'no'}`);
  L.push('');
  L.push('## WBS, cost and settlement rules');
  L.push('| WBS | name | budget | actual | rules |');
  L.push('|---|---|---|---|---|');
  const costBy = new Map<string, number>();
  for (const r of d.costs) costBy.set(r.wbs_code, (costBy.get(r.wbs_code) ?? 0) + Number(r.actual_cost));
  for (const w of d.wbs) {
    const rules = d.rules.filter((r) => r.wbs_code === w.wbs_code);
    L.push(`| ${w.wbs_code} | ${w.name} | ${fmtMoneyCap(w.budget_bac)} | ${fmtMoneyCap(costBy.get(w.wbs_code) ?? 0)} | ${rules.length ? rules.map((r) => `${r.percent}% → ${r.receiver_type} ${r.receiver_id}`).join('; ') : (costBy.get(w.wbs_code) ? 'NONE' : '—')} |`);
  }
  L.push('');
  L.push(`## Fixed assets (${d.assets.length})`);
  for (const a of d.assets) L.push(`- ${a.asset_number} ${a.description} · ${a.asset_class ?? '—'} · ${a.useful_life_years ?? '—'} yrs · ${fmtMoneyCap(a.acquisition_value)} · ${a.status}${a.capitalisation_date ? ` on ${a.capitalisation_date}` : ''}`);
  if (d.assets.length === 0) L.push('None created yet.');
  L.push('');
  L.push(`## Settlement readiness findings (${v.findings.length})`);
  for (const f of v.findings) L.push(`- [${f.severity.toUpperCase()}] ${f.title} — ${f.detail}${f.wbs?.length ? ` (WBS: ${f.wbs.join(', ')})` : ''}`);
  if (v.findings.length === 0) L.push('None — the chain is clean.');
  return L.join('\n');
}

/** Portfolio grounding for portfolio-scope calls by capital roles. */
export async function loadCapitalPortfolioState(sb: SupabaseClient, fiscalYear?: number): Promise<string> {
  const { data: projs } = await sb.from('projects').select('id, code, name, project_category, portfolio_bucket, fiscal_year, lifecycle_status, requested_budget, approved_budget_current, current_stage, stage_template_id, business_case').eq('project_type', 'capital').order('code');
  const projects = (projs ?? []) as Array<{ id: string; code: string; name: string; project_category: string | null; portfolio_bucket: string | null; fiscal_year: number | null; lifecycle_status: string | null; requested_budget: number | null; approved_budget_current: number | null; current_stage: number | null; stage_template_id: string | null; business_case: unknown }>;
  const { data: allocs } = await sb.from('portfolio_allocations').select('*').eq('project_type', 'capital');
  const { data: recs } = await sb.from('decision_records').select('title, decision_kind, status, required_body_key, amount, proposed_at, concurrences, required_concurrences').eq('project_type', 'capital').eq('status', 'proposed');
  const years = Array.from(new Set(((allocs ?? []) as PortfolioAllocation[]).map((a) => a.fiscal_year))).sort();
  const fy = fiscalYear && years.includes(fiscalYear) ? fiscalYear : years.filter((y) => y <= new Date().getFullYear()).slice(-1)[0] ?? years[0];
  const L: string[] = [];
  L.push(`# Capital portfolio — LIVE and AUTHORITATIVE · as of ${new Date().toISOString().slice(0, 10)} · fiscal year in focus FY${fy}`);
  L.push('');
  L.push('## Envelope by category');
  L.push('| Category | FY | allocated | reserve |');
  L.push('|---|---|---|---|');
  for (const a of ((allocs ?? []) as PortfolioAllocation[]).sort((x, y) => x.fiscal_year - y.fiscal_year)) L.push(`| ${capitalBucketLabel(a.bucket)} | FY${a.fiscal_year} | ${fmtMoneyCap(a.allocated_amount)} | ${fmtMoneyCap(a.reserve_amount)} |`);
  L.push('');
  L.push('## Projects');
  L.push('| Code | name | category | type | FY | lifecycle | stage | appropriated | EAC | EAC vs AFE | committed | actual | AuC | capitalised | in-service (approved → forecast) | readiness |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const data = await loadCapitalPortfolioData(sb, projects);
  for (const p of projects) {
    const d = data.get(p.id)!;
    const v = capitalProjectView(p, d);
    const bc = asCapitalCase(p.business_case);
    const blocks = v.findings.filter((f) => f.severity === 'block').length, warns = v.findings.filter((f) => f.severity === 'warn').length;
    L.push(`| ${p.code} | ${p.name} | ${capitalBucketLabel(p.portfolio_bucket)} | ${p.project_category} | ${p.fiscal_year ?? '—'} | ${p.lifecycle_status} | ${v.stageName ?? '—'} | ${fmtMoneyCap(v.chain.appropriated)} | ${fmtMoneyCap(bc.eac)} | ${v.trigger.over_pct === null ? '—' : `${v.trigger.over_pct > 0 ? '+' : ''}${v.trigger.over_pct}%`} | ${fmtMoneyCap(v.chain.committed)} | ${fmtMoneyCap(v.chain.actual)} | ${fmtMoneyCap(v.chain.auc_balance)} | ${fmtMoneyCap(v.chain.capitalised)} | ${bc.planned_in_service_date ?? '—'} → ${bc.in_service_date ?? '—'} | ${blocks} block · ${warns} warn${v.findings.length ? `: ${v.findings.map((f) => f.title).join('; ')}` : ''} |`);
  }
  L.push('');
  L.push(`## Open decisions (${(recs ?? []).length})`);
  for (const r of (recs ?? []) as Array<{ title: string; decision_kind: string; required_body_key: string; amount: number | null; proposed_at: string; concurrences: Array<{ body_key: string; outcome: string }> | null; required_concurrences: string[] | null }>) {
    const missing = (r.required_concurrences ?? []).filter((k) => !(r.concurrences ?? []).some((c) => c.body_key === k && c.outcome === 'concur'));
    L.push(`- ${r.proposed_at.slice(0, 10)} · ${r.decision_kind.replace(/_/g, ' ')} · ${r.title} · ${fmtMoneyCap(r.amount)} · awaiting ${r.required_body_key.replace(/_/g, ' ')}${missing.length ? ` (concurrence still owed: ${missing.join(', ')})` : ''}`);
  }
  L.push('');
  L.push(`RULES: AFE thresholds — under $1M plant manager, $1M–$10M business-unit head, above $10M capital committee; Finance concurs on every AFE and supplementary. A supplementary is routed on the REVISED total. Tolerance before a supplementary is required: ${SUPPLEMENTARY_TOLERANCE_PCT}% over appropriated.`);
  return L.join('\n');
}

