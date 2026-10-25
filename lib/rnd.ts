/**
 * R&D / NPI domain helpers — shared by the /portfolio/rnd page, the R&D
 * intake, the agent context and the seeds so the vocabulary never drifts.
 * Pure functions, like stage-gates.ts: the pages and the agents use the same
 * arithmetic, and neither can quietly invent its own.
 *
 * The R&D process (see AI-PMO-Multi-Project-Type-Proposal.docx and the
 * project-types analysis):
 *   • Money is released gate by gate, not granted once. Passing a gate
 *     releases the next stage's budget (sanction_events.kind='gate_budget').
 *   • The business case is re-underwritten at every gate, so it is a time
 *     series (business_case_versions), and the budget is deliberately re-set
 *     each time. A CPI measured against an original baseline is therefore
 *     meaningless here — it is not that the number is unhelpful, it is that
 *     nothing it could be measured against survives the next gate.
 *   • A kill is a good outcome when it is early and cheap.
 *
 * WHAT REPLACES CPI, and why each one earns its place:
 *   1. Gate-to-gate burn   — spend since the last gate vs the budget released
 *                            AT that gate. The only cost measure with a
 *                            baseline that is still true.
 *   2. Cycle time          — days in stage vs the template's declared target.
 *                            In NPI, time-to-market usually costs more than
 *                            overspend does; a programme six months late has
 *                            normally lost more value than one 20% over.
 *   3. ECV                 — expected commercial value: the case risk-adjusted
 *                            for BOTH technical and commercial success. Ranks
 *                            the pipeline the way margin ranks revenue work.
 *   4. Case drift          — how far the current case has moved from the one
 *                            approved at commit. Answers the question no
 *                            system asks today: does the case we funded still
 *                            hold, asked BEFORE the next gate rather than at it.
 */

import type {
  BusinessCaseVersion, GateDecision, LifecycleStatus, RndCategory,
  SanctionEvent, StageTemplate,
} from './types';
import { commitStage, stageAt } from './stage-gates';

// ---- vocabulary ------------------------------------------------------------

export const RND_BUCKETS = ['new_products', 'platform', 'sustaining', 'regulatory'] as const;
export type RndBucket = (typeof RND_BUCKETS)[number];

export const RND_BUCKET_LABELS: Record<string, string> = {
  new_products: 'New products',
  platform: 'Platform & applied research',
  sustaining: 'Sustaining & cost-down',
  regulatory: 'Regulatory & compliance',
};

/** Colour per bucket — same visual grammar as bucketStyle() on the IT dashboard. */
export const RND_BUCKET_STYLE: Record<string, { hex: string; accentBar: string; text: string; soft: string }> = {
  new_products: { hex: '#0284c7', accentBar: 'bg-sky-600', text: 'text-sky-700', soft: 'bg-sky-50' },
  platform: { hex: '#7c3aed', accentBar: 'bg-violet-600', text: 'text-violet-700', soft: 'bg-violet-50' },
  sustaining: { hex: '#059669', accentBar: 'bg-emerald-600', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  regulatory: { hex: '#d97706', accentBar: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50' },
};

export function rndBucketStyle(b: string | null | undefined): { hex: string; accentBar: string; text: string; soft: string; label: string } {
  const key = b ?? 'unassigned';
  return {
    ...(RND_BUCKET_STYLE[key] ?? { hex: '#64748b', accentBar: 'bg-slate-500', text: 'text-slate-700', soft: 'bg-slate-50' }),
    label: rndBucketLabel(key),
  };
}

export const RND_CATEGORY_LABELS: Record<RndCategory, string> = {
  new_product: 'New product development',
  derivative: 'Derivative / line extension',
  platform_research: 'Platform / applied research',
};

export function rndBucketLabel(b: string | null | undefined): string {
  if (!b) return '—';
  return RND_BUCKET_LABELS[b] ?? b.replace(/_/g, ' ');
}

export function rndCategoryLabel(c: string | null | undefined): string {
  if (!c) return '—';
  return (RND_CATEGORY_LABELS as Record<string, string>)[c] ?? c.replace(/_/g, ' ');
}

// ---- 1. expected commercial value -----------------------------------------

/**
 * Cooper's ECV, over one business case version:
 *
 *     ECV = [ (NPV × P(commercial success)) − launch cost ] × P(technical success) − development cost
 *
 * The two probabilities are applied at different points on purpose. Commercial
 * risk discounts the income only. Technical risk discounts the income AND the
 * launch spend, because a programme that fails technically never spends the
 * launch money — but it has already spent the development money, which is why
 * development cost sits outside the technical bracket.
 *
 * Returns null when the version has no NPV: an R&D case without an income
 * estimate is not a low-value case, it is an unwritten one, and showing it as
 * zero would rank it below genuinely poor cases.
 */
export function ecv(v: Pick<BusinessCaseVersion, 'npv' | 'launch_cost' | 'development_cost_estimate' | 'technical_success_pct' | 'commercial_success_pct'> | null | undefined): number | null {
  if (!v || v.npv === null || v.npv === undefined) return null;
  const npv = Number(v.npv);
  const launch = Number(v.launch_cost ?? 0);
  const dev = Number(v.development_cost_estimate ?? 0);
  const pts = pct(v.technical_success_pct, 100);
  const pcs = pct(v.commercial_success_pct, 100);
  return Math.round(((npv * pcs - launch) * pts - dev) * 100) / 100;
}

/** A probability held as 0-100, returned as 0-1; missing means "not discounted". */
function pct(n: number | null | undefined, fallback: number): number {
  const v = Number(n ?? fallback);
  if (!Number.isFinite(v)) return fallback / 100;
  return Math.max(0, Math.min(100, v)) / 100;
}

/**
 * Pipeline ranking. ECV alone would starve platform research, which carries no
 * NPV by construction — so cases without an income estimate are ranked last
 * among their own kind rather than mixed in at zero, and the caller shows them
 * in their own group. Ties break on the cheaper programme, as in the IT
 * waterline: two equal cases, fund the one that risks less.
 */
export function rankPipelineByEcv<T extends { case_version: BusinessCaseVersion | null; requested_budget?: number | null }>(rows: T[]): (T & { ecv: number | null; rank: number })[] {
  const scored = rows.map((r) => ({ ...r, ecv: ecv(r.case_version), rank: 0 }));
  scored.sort((a, b) => {
    if ((a.ecv === null) !== (b.ecv === null)) return a.ecv === null ? 1 : -1;
    if (a.ecv !== null && b.ecv !== null && a.ecv !== b.ecv) return b.ecv - a.ecv;
    return Number(a.requested_budget ?? 0) - Number(b.requested_budget ?? 0);
  });
  scored.forEach((r, i) => { r.rank = i + 1; });
  return scored;
}

// ---- 2. gate-to-gate burn --------------------------------------------------

/** Minimal shape for a posted cost row; keeps this module free of the SAP DTOs. */
export type SpendRow = { posting_date: string; amount: number };

export type GateBurn = {
  /** Gate that released the budget being burned against; null before any gate. */
  since_gate: string | null;
  since_date: string | null;
  released: number;
  spent: number;
  /** Spend as a share of what was released, 0-100+; null when nothing released. */
  pct: number | null;
  over: boolean;
  /** True when no gate has released a budget yet — spend is pre-gate seed money. */
  pre_gate: boolean;
};

/** Gate budgets, oldest first. */
export function gateBudgets(events: SanctionEvent[]): SanctionEvent[] {
  return events
    .filter((e) => e.kind === 'gate_budget')
    .slice()
    .sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
}

/**
 * Burn since the last gate against the budget that gate released.
 *
 * Deliberately NOT cumulative: cumulative spend against a cumulative budget
 * hides an overrun in the current stage behind underspend in earlier ones,
 * which is exactly the failure this measure exists to catch. Cumulative spend
 * against the case's development estimate is a separate question — caseDrift()
 * answers that one.
 */
export function gateToGateBurn(decisions: GateDecision[], events: SanctionEvent[], spend: SpendRow[]): GateBurn {
  const gos = decisions
    .filter((d) => d.decision === 'go')
    .slice()
    .sort((a, b) => (a.decided_on < b.decided_on ? 1 : -1));
  const lastGo = gos[0] ?? null;
  const budgets = gateBudgets(events);
  const latest = budgets.length ? budgets[budgets.length - 1] : null;

  const since = lastGo?.decided_on ?? null;
  const spent = spend
    .filter((r) => !since || r.posting_date >= since)
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const released = Number(latest?.amount ?? 0);

  return {
    since_gate: lastGo?.gate_name ?? null,
    since_date: since,
    released,
    spent: Math.round(spent * 100) / 100,
    pct: released ? Math.round((spent / released) * 1000) / 10 : null,
    over: released > 0 && spent > released,
    pre_gate: !lastGo,
  };
}

// ---- 3. cycle time ---------------------------------------------------------

export type StageCycle = {
  seq: number;
  key: string;
  name: string;
  gate_name: string;
  benchmark_days: number | null;
  /** Null when the stage has not started. */
  actual_days: number | null;
  in_progress: boolean;
  /** actual − benchmark; positive is slow. Null when either side is missing. */
  delta_days: number | null;
  pct_of_benchmark: number | null;
};

/**
 * Days spent in each stage, against the template's declared target.
 *
 * A stage starts when the previous gate said Go (or at project start for the
 * first one) and ends at its own gate decision. A stage that has started but
 * not gated is measured to `asOf` and flagged in_progress, because a stage
 * running long is only visible while it is still running — reporting it after
 * the gate is reporting history.
 *
 * The benchmark is the template's declared target, not an observed median.
 * portfolioMedianDays() gives the observed figure separately so that a slow
 * programme and a wrong benchmark stay distinguishable; collapsing the two is
 * how benchmarks quietly drift to match whatever the organisation already does.
 */
export function cycleTimes(
  template: StageTemplate | null | undefined,
  decisions: GateDecision[],
  projectStart: string | null,
  asOf: string = new Date().toISOString().slice(0, 10),
): StageCycle[] {
  if (!template) return [];
  const out: StageCycle[] = [];
  let cursor = projectStart;

  for (const s of template.stages.slice().sort((a, b) => a.seq - b.seq)) {
    const d = decisions
      .filter((x) => x.stage_seq === s.seq && x.decision !== 'hold' && x.decision !== 'resume')
      .sort((a, b) => (a.decided_on < b.decided_on ? 1 : -1))[0] ?? null;
    const started = cursor;
    const ended = d?.decided_on ?? null;
    const inProgress = Boolean(started) && !ended;
    const actual = started ? daysBetween(started, ended ?? asOf) : null;
    const bench = s.benchmark_days ?? null;

    out.push({
      seq: s.seq,
      key: s.key,
      name: s.name,
      gate_name: s.gate_name,
      benchmark_days: bench,
      actual_days: actual,
      in_progress: inProgress,
      delta_days: actual !== null && bench !== null ? actual - bench : null,
      pct_of_benchmark: actual !== null && bench ? Math.round((actual / bench) * 1000) / 10 : null,
    });

    // Only a Go opens the next stage; a kill, recycle or defer does not.
    cursor = d && d.decision === 'go' ? d.decided_on : null;
    if (!cursor) {
      // Remaining stages are unstarted; emit them flat so the page can show the
      // whole model rather than only the part that has happened.
      for (const rest of template.stages.filter((x) => x.seq > s.seq).sort((a, b) => a.seq - b.seq)) {
        out.push({
          seq: rest.seq, key: rest.key, name: rest.name, gate_name: rest.gate_name,
          benchmark_days: rest.benchmark_days ?? null, actual_days: null,
          in_progress: false, delta_days: null, pct_of_benchmark: null,
        });
      }
      break;
    }
  }
  return out;
}

/** Observed median days per stage key across a set of programmes' cycle times. */
export function portfolioMedianDays(all: StageCycle[][]): Record<string, number> {
  const byKey: Record<string, number[]> = {};
  for (const rows of all) {
    for (const r of rows) {
      if (r.actual_days === null || r.in_progress) continue;
      (byKey[r.key] ??= []).push(r.actual_days);
    }
  }
  const out: Record<string, number> = {};
  for (const [k, xs] of Object.entries(byKey)) {
    const s = xs.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    out[k] = s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  }
  return out;
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / 86_400_000));
}

// ---- 4. kill quality -------------------------------------------------------

export type KillQualityGrade = 'early' | 'on_case' | 'late' | 'overspent';

export type KillQuality = {
  grade: KillQualityGrade;
  label: string;
  /** One sentence a gatekeeper can read out. */
  rationale: string;
  stage_name: string | null;
  gate_name: string | null;
  pre_commit: boolean;
  spend: number;
  released: number;
};

/**
 * Grade a termination. DERIVED, never entered — nobody grades their own kill.
 *
 * The grading only asks two things: did it happen before the commit gate, and
 * did it stay inside the money that had actually been released for it. Those
 * are the two facts that decide whether the process worked. It deliberately
 * does NOT ask whether the project "would have succeeded", because that is
 * unknowable and inviting the question is how kill rates get argued down.
 *
 *   early     — killed before commit, within released budget. The system
 *               working as designed; a pipeline with none of these is not
 *               screening.
 *   overspent — killed before commit, but over the money released. The
 *               decision was right and late; the spend ceiling did not hold.
 *   on_case   — killed at or just after commit on new evidence, within budget.
 *               Expensive but defensible: something genuinely changed.
 *   late      — killed well after commit. The evidence was probably available
 *               earlier; this is the one worth a lessons-learned.
 */
export function killQuality(
  template: StageTemplate | null | undefined,
  decisions: GateDecision[],
  events: SanctionEvent[],
  spend: SpendRow[],
): KillQuality | null {
  const kill = decisions
    .filter((d) => d.decision === 'kill')
    .sort((a, b) => (a.decided_on < b.decided_on ? 1 : -1))[0] ?? null;
  if (!kill) return null;

  const commit = commitStage(template);
  const stage = stageAt(template, kill.stage_seq);
  const preCommit = commit ? kill.stage_seq < commit.seq : true;
  const atCommit = commit ? kill.stage_seq === commit.seq : false;

  const spent = spend
    .filter((r) => r.posting_date <= kill.decided_on)
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const released = gateBudgets(events)
    .filter((e) => !e.authorised_on || e.authorised_on <= kill.decided_on)
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);

  // 10% tolerance: posting lag routinely lands a few invoices after the
  // decision, and grading a good kill as an overspend on timing noise would
  // discredit the whole measure.
  const overspent = released > 0 && spent > released * 1.1;

  let grade: KillQualityGrade;
  if (preCommit && !overspent) grade = 'early';
  else if (preCommit) grade = 'overspent';
  else if (atCommit && !overspent) grade = 'on_case';
  else grade = 'late';

  const money = `${fmtMoneyRnd(spent)} spent against ${fmtMoneyRnd(released)} released`;
  const where = stage ? `at ${stage.gate_name}` : `at stage ${kill.stage_seq}`;

  const rationale: Record<KillQualityGrade, string> = {
    early: `Stopped ${where}, before commit, with ${money}. This is the screening process doing its job.`,
    overspent: `Stopped ${where}, before commit, but with ${money} — the decision was right, the spend ceiling was not held.`,
    on_case: `Stopped ${where}, at the commit gate, with ${money}. Expensive but defensible if the evidence genuinely changed here.`,
    late: `Stopped ${where}, after commit, with ${money}. Worth asking at the lessons-learned what was knowable at an earlier gate.`,
  };

  const label: Record<KillQualityGrade, string> = {
    early: 'Early kill', overspent: 'Late kill, over budget', on_case: 'Killed on new evidence', late: 'Late kill',
  };

  return {
    grade,
    label: label[grade],
    rationale: rationale[grade],
    stage_name: stage?.name ?? null,
    gate_name: stage?.gate_name ?? kill.gate_name ?? null,
    pre_commit: preCommit,
    spend: Math.round(spent * 100) / 100,
    released: Math.round(released * 100) / 100,
  };
}

/**
 * Pipeline health. A kill rate of zero is a finding, not a clean sheet: it
 * means either nothing speculative is being attempted or nothing is being
 * screened. Returned as counts and a rate so the page can say so without the
 * caller having to re-derive it.
 */
export function pipelineHealth(rows: { lifecycle_status: LifecycleStatus; kill?: KillQuality | null }[]): {
  total: number; terminated: number; kill_rate_pct: number; early_kills: number; late_kills: number; note: string;
} {
  const total = rows.length;
  const terminated = rows.filter((r) => r.lifecycle_status === 'terminated').length;
  const early = rows.filter((r) => r.kill?.grade === 'early').length;
  const late = rows.filter((r) => r.kill?.grade === 'late' || r.kill?.grade === 'overspent').length;
  const rate = total ? Math.round((terminated / total) * 1000) / 10 : 0;
  const note = total === 0
    ? 'No programmes in scope.'
    : terminated === 0
      ? 'Nothing terminated in this population — worth asking whether the early gates are screening at all.'
      : early >= late
        ? 'Most terminations are early and within budget: the screens are working.'
        : 'More terminations are late than early: the evidence is arriving after commit, not before it.';
  return { total, terminated, kill_rate_pct: rate, early_kills: early, late_kills: late, note };
}

// ---- 5. case drift ---------------------------------------------------------

export type DriftLine = {
  metric: string;
  at_commit: number | string | null;
  current: number | string | null;
  delta: number | null;
  /** Percent change where the metric is numeric and the commit value non-zero. */
  delta_pct: number | null;
  /** True where the movement is unfavourable (value down, cost up, launch later). */
  adverse: boolean;
};

export type CaseDrift = {
  commit_version: BusinessCaseVersion | null;
  current_version: BusinessCaseVersion | null;
  lines: DriftLine[];
  ecv_at_commit: number | null;
  ecv_current: number | null;
  /** True when the current ECV has gone negative since a positive commit ECV. */
  underwater: boolean;
  summary: string;
};

/**
 * Compare the case as it stands against the case that was approved at the
 * commit gate — the version the money was actually released against.
 *
 * Against commit, not against version 1, on purpose. Movement between the
 * first sketch and the funded case is the process working: that is what the
 * early stages are for. Movement AFTER the commitment is the thing nobody
 * currently watches, and it is the difference between finding out now and
 * finding out at the next gate when the money is already gone.
 */
export function caseDrift(versions: BusinessCaseVersion[], commitStageSeq: number | null): CaseDrift {
  const sorted = versions.slice().sort((a, b) => a.version - b.version);
  const current = sorted.filter((v) => v.is_current).slice(-1)[0] ?? sorted[sorted.length - 1] ?? null;
  const commitV = commitStageSeq === null
    ? null
    : sorted.filter((v) => v.gate_stage_seq !== null && v.gate_stage_seq <= commitStageSeq).slice(-1)[0] ?? null;

  const lines: DriftLine[] = [];
  if (commitV && current && commitV.id !== current.id) {
    lines.push(num('NPV', commitV.npv, current.npv, false));
    lines.push(num('Peak annual sales', commitV.peak_annual_sales, current.peak_annual_sales, false));
    lines.push(num('Development cost', commitV.development_cost_estimate, current.development_cost_estimate, true));
    lines.push(num('Launch cost', commitV.launch_cost, current.launch_cost, true));
    lines.push(num('Technical success %', commitV.technical_success_pct, current.technical_success_pct, false));
    lines.push(num('Commercial success %', commitV.commercial_success_pct, current.commercial_success_pct, false));
    lines.push(dateLine('Launch date', commitV.launch_date, current.launch_date));
  }

  const eCommit = ecv(commitV);
  const eNow = ecv(current);
  const underwater = eCommit !== null && eNow !== null && eCommit > 0 && eNow <= 0;

  let summary: string;
  if (!commitV) summary = 'No case has been underwritten at the commit gate yet, so there is nothing to drift from.';
  else if (!current || commitV.id === current.id) summary = 'The case has not been re-underwritten since commit.';
  else if (underwater) summary = 'The case has gone negative since commit: on the current numbers this would not be funded again.';
  else if (eCommit !== null && eNow !== null && eCommit !== 0) {
    const move = Math.round(((eNow - eCommit) / Math.abs(eCommit)) * 1000) / 10;
    summary = move < 0
      ? `Expected commercial value is down ${Math.abs(move)}% against the case approved at commit.`
      : `Expected commercial value is up ${move}% against the case approved at commit.`;
  } else summary = 'The case has been re-underwritten since commit; the movements are listed below.';

  return { commit_version: commitV, current_version: current, lines, ecv_at_commit: eCommit, ecv_current: eNow, underwater, summary };
}

function num(metric: string, a: number | null, b: number | null, costLike: boolean): DriftLine {
  const av = a === null || a === undefined ? null : Number(a);
  const bv = b === null || b === undefined ? null : Number(b);
  const delta = av !== null && bv !== null ? Math.round((bv - av) * 100) / 100 : null;
  return {
    metric, at_commit: av, current: bv, delta,
    delta_pct: av !== null && bv !== null && av !== 0 ? Math.round(((bv - av) / Math.abs(av)) * 1000) / 10 : null,
    adverse: delta === null ? false : costLike ? delta > 0 : delta < 0,
  };
}

function dateLine(metric: string, a: string | null, b: string | null): DriftLine {
  const delta = a && b ? daysBetween(a, b) * (Date.parse(b) < Date.parse(a) ? -1 : 1) : null;
  return { metric, at_commit: a, current: b, delta, delta_pct: null, adverse: delta !== null && delta > 0 };
}

// ---- formatting ------------------------------------------------------------

/**
 * Same money formatting as the IT workspace. Duplicated rather than imported
 * so lib/rnd.ts carries no dependency on lib/it-portfolio.ts — the two PMOs
 * are independent, and a shared helper here would be the first thread of a
 * coupling nobody intended.
 */
export function fmtMoneyRnd(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}

export function fmtDays(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n} day${Math.abs(n) === 1 ? '' : 's'}`;
}
