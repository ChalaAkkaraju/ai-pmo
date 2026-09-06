/**
 * IT portfolio domain helpers — shared by the /portfolio/it page, the IT
 * intake, the agent context and the seeds so the vocabulary never drifts.
 *
 * The IT PMO process (see AI-PMO-Multi-Project-Type-Proposal.docx §7.1):
 *   • AOP: the IT envelope is allocated across business-technology buckets,
 *     each with an unallocated reserve; compliance is a mandatory lane.
 *   • Projects are ranked WITHIN their bucket and funded down to a per-bucket
 *     waterline; below it they are deferred with their case kept.
 *   • Continuations (a multi-year project asking for its next-year slice) are
 *     ranked on cost-to-complete vs benefit still achievable, never auto-funded.
 *   • Stage Gate 1 locks scope, budget and the capital/expense split; changes
 *     after it are change orders, zero-sum inside the bucket.
 */

import type { BusinessCase, ItCategory, LifecycleStatus, PortfolioAllocation, Project, ValueType } from './types';

// ---- vocabulary ------------------------------------------------------------

export const IT_BUCKETS = ['infrastructure', 'applications', 'security', 'compliance'] as const;
export type ItBucket = (typeof IT_BUCKETS)[number];

export const IT_BUCKET_LABELS: Record<string, string> = {
  infrastructure: 'Infrastructure',
  applications: 'Applications',
  security: 'Security',
  compliance: 'Compliance',
};

/** Colour per bucket — mirrors segmentStyle() on the revenue dashboard. Tailwind classes are literal so JIT keeps them. */
export const IT_BUCKET_STYLE: Record<string, { hex: string; accentBar: string; text: string; soft: string }> = {
  infrastructure: { hex: '#0284c7', accentBar: 'bg-sky-600', text: 'text-sky-700', soft: 'bg-sky-50' },
  applications: { hex: '#059669', accentBar: 'bg-emerald-600', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  security: { hex: '#7c3aed', accentBar: 'bg-violet-600', text: 'text-violet-700', soft: 'bg-violet-50' },
  compliance: { hex: '#d97706', accentBar: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50' },
};
export function bucketStyle(b: string | null | undefined): { hex: string; accentBar: string; text: string; soft: string; label: string } {
  const key = b ?? 'unassigned';
  return { ...(IT_BUCKET_STYLE[key] ?? { hex: '#64748b', accentBar: 'bg-slate-500', text: 'text-slate-700', soft: 'bg-slate-50' }), label: bucketLabel(key) };
}

export const IT_CATEGORY_LABELS: Record<ItCategory, string> = {
  design_development: 'Design & development',
  deployment: 'Deployment / rollout',
  maintenance_upgrade: 'Maintenance / upgrade',
};

export const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  hard_savings: 'Hard savings',
  soft_benefit: 'Soft benefit',
  risk_reduction: 'Risk reduction',
  enablement: 'Enablement',
  compliance: 'Compliance / mandatory',
};

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  deferred: 'Deferred',
  active: 'Active',
  on_hold: 'On hold',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

export function bucketLabel(b: string | null | undefined): string {
  if (!b) return '—';
  return IT_BUCKET_LABELS[b] ?? b.replace(/_/g, ' ');
}
export function categoryLabel(c: string | null | undefined): string {
  if (!c) return '—';
  return (IT_CATEGORY_LABELS as Record<string, string>)[c] ?? c.replace(/_/g, ' ');
}
export function valueTypeLabel(v: string | null | undefined): string {
  if (!v) return '—';
  return (VALUE_TYPE_LABELS as Record<string, string>)[v] ?? v.replace(/_/g, ' ');
}
export function lifecycleLabel(s: string | null | undefined): string {
  if (!s) return '—';
  return (LIFECYCLE_LABELS as Record<string, string>)[s] ?? s.replace(/_/g, ' ');
}

// ---- business-case arithmetic ---------------------------------------------

/** Benefit horizon used for the headline ROI on an IT business case (years). */
export const ROI_HORIZON_YEARS = 3;

/**
 * Recompute ROI (%) and payback (months) from budget and annual benefit.
 * ROI is over the standard benefit horizon — (horizon × annual benefit − budget) / budget —
 * which is how IT cases are normally compared; payback is simple (budget / annual benefit).
 */
export function recomputeCase(requestedBudget: number | null, annualBenefit: number | null | undefined): { roi_pct: number | null; payback_months: number | null } {
  const b = Number(requestedBudget ?? 0);
  const a = Number(annualBenefit ?? 0);
  if (!b || !a) return { roi_pct: null, payback_months: null };
  return {
    roi_pct: Math.round(((a * ROI_HORIZON_YEARS - b) / b) * 1000) / 10,
    payback_months: Math.round((b / a) * 12 * 10) / 10,
  };
}

/**
 * Ranking score inside a discretionary bucket. Strategic score (0-100) and the
 * 3-year ROI (capped at 300% and scaled to 0-100) are weighted equally; hard
 * savings and enablement get a small tiebreak over soft benefits (the CFO
 * trusts them more).
 */
export function rankingScore(bc: BusinessCase | null | undefined, requestedBudget: number | null): number {
  if (!bc) return 0;
  const strategic = clamp(Number(bc.strategic_score ?? 0), 0, 100);
  // Always recompute from the current budget so a stale stored figure never drives the ranking.
  const roi = recomputeCase(requestedBudget, bc.annual_benefit).roi_pct ?? bc.roi_pct ?? 0;
  const roiCapped = clamp(Number(roi), 0, 300) / 3;
  const tiebreak = bc.value_type === 'hard_savings' || bc.value_type === 'enablement' ? 2 : 0;
  return Math.round((0.5 * strategic + 0.5 * roiCapped + tiebreak) * 10) / 10;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : 0));
}

// ---- waterline --------------------------------------------------------------

export type RankedProject = {
  project: Pick<Project, 'id' | 'code' | 'name' | 'project_category' | 'portfolio_bucket' | 'fiscal_year' | 'lifecycle_status' | 'requested_budget' | 'business_case' | 'continuation_of_id' | 'fiscal_years_approved'>;
  rank: number;
  score: number;
  amount: number;
  cumulative: number;
  funded: boolean;
  is_continuation: boolean;
  is_mandatory: boolean;
};

export type BucketRanking = {
  bucket: string;
  label: string;
  allocation: PortfolioAllocation | null;
  fundable: number; // allocated - reserve
  requested: number;
  funded_amount: number;
  remaining: number;
  rows: RankedProject[];
  first_below: RankedProject | null;
  shortfall: number; // amount that would lift first_below over the line
};

/**
 * Rank the projects submitted for a fiscal year within each bucket and draw
 * the waterline against (allocation − reserve). Mandatory-lane buckets rank
 * by deadline (payback_months used as a proxy when no deadline) then cost;
 * discretionary buckets rank by score. Continuations are placed first inside
 * the bucket (finishing beats starting) but still have to fit under the line.
 */
export function rankFiscalYear(
  projects: RankedProject['project'][],
  allocations: PortfolioAllocation[],
  fiscalYear: number,
): BucketRanking[] {
  const inYear = projects.filter((p) => p.fiscal_year === fiscalYear);
  const buckets = new Set<string>([...allocations.filter((a) => a.fiscal_year === fiscalYear).map((a) => a.bucket), ...inYear.map((p) => p.portfolio_bucket ?? 'unassigned')]);
  const out: BucketRanking[] = [];
  for (const bucket of Array.from(buckets)) {
    const allocation = allocations.find((a) => a.fiscal_year === fiscalYear && a.bucket === bucket) ?? null;
    const mandatory = allocation?.is_mandatory_lane ?? bucket === 'compliance';
    const fundable = allocation ? Number(allocation.allocated_amount) - Number(allocation.reserve_amount) : 0;
    const candidates = inYear
      .filter((p) => (p.portfolio_bucket ?? 'unassigned') === bucket)
      .filter((p) => p.lifecycle_status !== 'cancelled' && p.lifecycle_status !== 'closed');
    const scored = candidates.map((p) => {
      const isCont = Boolean(p.continuation_of_id) || (p.fiscal_years_approved ?? []).some((y) => y < fiscalYear);
      const score = rankingScore(p.business_case, p.requested_budget);
      return { p, isCont, score, amount: Number(p.requested_budget ?? 0) };
    });
    // Deferred projects keep their case but release their money: they sit at the
    // bottom of the bucket, outside the cumulative, until a later waterline.
    const isParked = (p: RankedProject['project']) => p.lifecycle_status === 'deferred';
    scored.sort((a, b) => {
      if (isParked(a.p) !== isParked(b.p)) return isParked(a.p) ? 1 : -1;
      if (a.isCont !== b.isCont) return a.isCont ? -1 : 1;
      if (mandatory) {
        const pa = a.p.business_case?.payback_months ?? 9999, pb = b.p.business_case?.payback_months ?? 9999;
        if (pa !== pb) return pa - pb;
        return a.amount - b.amount;
      }
      if (b.score !== a.score) return b.score - a.score;
      return a.amount - b.amount;
    });
    let cumulative = 0, funded_amount = 0, requested = 0;
    const rows: RankedProject[] = [];
    let blocked = false;
    scored.forEach((s, i) => {
      requested += s.amount;
      if (isParked(s.p)) {
        rows.push({ project: s.p, rank: i + 1, score: s.score, amount: s.amount, cumulative, funded: false, is_continuation: s.isCont, is_mandatory: mandatory });
        return;
      }
      const fits = !blocked && cumulative + s.amount <= fundable;
      cumulative += s.amount;
      if (fits) funded_amount += s.amount; else blocked = true;
      rows.push({
        project: s.p, rank: i + 1, score: s.score, amount: s.amount, cumulative,
        funded: fits, is_continuation: s.isCont, is_mandatory: mandatory,
      });
    });
    const fb = rows.find((r) => !r.funded && !isParked(r.project)) ?? null;
    out.push({
      bucket, label: bucketLabel(bucket), allocation, fundable, requested, funded_amount,
      remaining: fundable - funded_amount, rows, first_below: fb,
      shortfall: fb ? Math.max(0, fb.amount - (fundable - funded_amount)) : 0,
    });
  }
  // Stable order: configured buckets first, then anything else.
  const order = (b: string) => { const i = (IT_BUCKETS as readonly string[]).indexOf(b); return i === -1 ? 99 : i; };
  return out.sort((a, b) => order(a.bucket) - order(b.bucket) || a.bucket.localeCompare(b.bucket));
}

/** Money formatting used across the IT workspace (whole currency units in, $k / $M out). */
export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}
