/**
 * Project detail page.
 *
 * Shows the project header (name, segment, contract, etc.) and tabbed views
 * for Issues / Risks / Change Orders / Variance / Planning artefacts /
 * Invoke Agent.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ProjectTabs } from '@/components/project-tabs';
import { SetupChecklist } from '@/components/setup-checklist';
import type { WorkPackage } from '@/components/wbs-canonical-tree';
import type { Task } from '@/components/schedule-view';
import { computeEv, evCurve, computeEvByWbs, earnedSchedule } from '@/lib/earned-value';
import { parseForecast } from '@/lib/forecast';
import { computeCommitment, costByElement, computeLabourProductivity, computeLabourByWbs } from '@/lib/cost-commitment';
import { computeBilling } from '@/lib/billing';
import { computeResultsAnalysis } from '@/lib/results-analysis';
import { computeLoad, type ResAssignment, type LoadResult } from '@/lib/resource-load';
import { computeMarginBridge } from '@/lib/margin';
import { segmentStyle, statusBadge } from '@/lib/segment-style';
import { roleSees } from '@/lib/workspace';
import { bucketLabel, bucketStyle, categoryLabel, fmtMoney, lifecycleLabel } from '@/lib/it-portfolio';
import { isCommitted, stageAt } from '@/lib/stage-gates';
import type { BenefitsReport, DecisionRecord, GateDecision, PortfolioAllocation, ProjectType, ResourceDisplacement, SanctionEvent, StageTemplate } from '@/lib/types';
import { bodiesFor, isActionableBy, loadGovernance } from '@/lib/governance';
import type { GatesPanelProps } from '@/components/gates-panel';

// Always fetch fresh from Supabase — no Next.js data cache
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const PLANNING_AGENT_TYPES = [
  'charter_drafter',
  'stakeholder_analyst',
  'wbs_builder',
  'schedule_reasoner',
  'budget_builder',
  'communications_planner',
  'lessons_learned_synthesiser',
  'closeout_reporter',
];

// Planning outputs for a project. edited_* columns exist only after migration
// 0015, so we try with them and fall back without — keeps the planning tabs +
// setup checklist working before 0015 is applied.
async function loadPlanningOutputs(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
) {
  const base = 'id, agent_type, invoked_at, output_md, user_prompt, tokens_used, cost_usd';
  let res = await supabase
    .from('agent_outputs')
    .select(`${base}, edited_md, edited_by_role_type, edited_at`)
    .eq('project_id', projectId)
    .in('agent_type', PLANNING_AGENT_TYPES)
    .order('invoked_at', { ascending: false });
  if (res.error) {
    res = (await supabase
      .from('agent_outputs')
      .select(base)
      .eq('project_id', projectId)
      .in('agent_type', PLANNING_AGENT_TYPES)
      .order('invoked_at', { ascending: false })) as typeof res;
  }
  return res.data ?? [];
}

// Work packages (canonical WBS, mirrored from SAP PS). Table exists only after
// migration 0017 — resilient so the page works before it is applied.
async function loadWorkPackages(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<WorkPackage[]> {
  const cols = 'wbs_code, parent_wbs_code, name, responsible_role_type, is_billing_element, budget_bac, source_system, synced_at';
  let res = await supabase
    .from('work_packages')
    .select(`${cols}, status`)
    .eq('project_id', projectId);
  if (res.error) {
    // Pre-0018 (no status column) — fall back; treat all rows as active.
    const fb = await supabase.from('work_packages').select(cols).eq('project_id', projectId);
    if (fb.error) return [];
    return ((fb.data ?? []) as WorkPackage[]).map((w) => ({ ...w, status: 'active' as const }));
  }
  return (res.data ?? []) as WorkPackage[];
}

// Tasks (canonical schedule, mirrored from the scheduler). Resilient pre-0017.
async function loadTasks(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<Task[]> {
  const res = await supabase
    .from('tasks')
    .select('wbs_code, name, start_date, finish_date, percent_complete, is_critical, owner_role_type, source_system, synced_at')
    .eq('project_id', projectId);
  if (res.error) return [];
  return (res.data ?? []) as Task[];
}

// Cost actuals (mirrored from SAP PS) — inputs to earned value. Resilient.
async function loadCostActuals(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<Array<{ wbs_code: string | null; value_category: string | null; actual_cost: number | null; planned_value: number | null; synced_at: string | null }>> {
  const res = await supabase
    .from('cost_actuals')
    .select('wbs_code, value_category, actual_cost, planned_value, synced_at')
    .eq('project_id', projectId);
  if (res.error) return [];
  return res.data ?? [];
}

async function loadPurchaseOrders(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<Array<{ wbs_code: string | null; vendor: string | null; po_number: string | null; value_category: string | null; po_value: number | null; received_value: number | null; status: string | null }>> {
  const res = await supabase
    .from('purchase_orders')
    .select('wbs_code, vendor, po_number, value_category, po_value, received_value, status')
    .eq('project_id', projectId);
  if (res.error) return [];
  return res.data ?? [];
}

async function loadLabourRows(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<Array<{ wbs_code: string | null; planned_work_hours: number | null; actual_work_hours: number | null; hourly_rate: number | null }>> {
  const res = await supabase
    .from('resource_assignments')
    .select('planned_work_hours, actual_work_hours, hourly_rate, tasks(wbs_code)')
    .eq('project_id', projectId)
    .limit(20000);
  if (res.error) return [];
  return (res.data ?? []).map((r) => {
    const t = (r as { tasks?: { wbs_code?: string | null } | { wbs_code?: string | null }[] | null }).tasks;
    const wbs = Array.isArray(t) ? (t[0]?.wbs_code ?? null) : (t?.wbs_code ?? null);
    return {
      wbs_code: wbs,
      planned_work_hours: (r as { planned_work_hours: number | null }).planned_work_hours,
      actual_work_hours: (r as { actual_work_hours: number | null }).actual_work_hours,
      hourly_rate: (r as { hourly_rate: number | null }).hourly_rate,
    };
  });
}

async function loadBilling(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<Array<{ wbs_code: string | null; invoice_number: string | null; billing_type: string | null; amount: number | null; billed_week: number | null; status: string | null }>> {
  const res = await supabase
    .from('billing_events')
    .select('wbs_code, invoice_number, billing_type, amount, billed_week, status')
    .eq('project_id', projectId);
  if (res.error) return [];
  return res.data ?? [];
}

async function loadResultsAnalysis(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<Array<{ wbs_code: string | null; ra_method: string | null; poc_pct: number | null; planned_cost: number | null; planned_revenue: number | null; cost_of_sales: number | null; calculated_revenue: number | null; recognized_margin: number | null; reserve: number | null }>> {
  const res = await supabase
    .from('results_analysis')
    .select('wbs_code, ra_method, poc_pct, planned_cost, planned_revenue, cost_of_sales, calculated_revenue, recognized_margin, reserve')
    .eq('project_id', projectId);
  if (res.error) return [];
  return res.data ?? [];
}

async function loadScheduleEnvelope(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<{ forecastFinish: string | null; targetFinish: string | null; breachDays: number | null }> {
  const [wpRes, tRes] = await Promise.all([
    supabase.from('work_packages').select('parent_wbs_code, target_finish').eq('project_id', projectId),
    supabase.from('tasks').select('finish_date').eq('project_id', projectId),
  ]);
  if (wpRes.error || tRes.error) return { forecastFinish: null, targetFinish: null, breachDays: null };
  const targets = (wpRes.data ?? [])
    .filter((w) => (w as { parent_wbs_code: string | null }).parent_wbs_code && (w as { target_finish: string | null }).target_finish)
    .map((w) => Date.parse(String((w as { target_finish: string | null }).target_finish)))
    .filter((n) => !Number.isNaN(n));
  const finishes = (tRes.data ?? []).map((t) => Date.parse(String((t as { finish_date: string | null }).finish_date))).filter((n) => !Number.isNaN(n));
  const forecastFinish = finishes.length ? new Date(Math.max(...finishes)).toISOString() : null;
  if (!targets.length || !finishes.length) return { forecastFinish, targetFinish: null, breachDays: null };
  const env = Math.max(...targets);
  const fc = Math.max(...finishes);
  return { forecastFinish, targetFinish: new Date(env).toISOString(), breachDays: Math.round((fc - env) / 86400000) };
}

async function loadSoldBudget(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<number | null> {
  const res = await supabase
    .from('work_packages')
    .select('parent_wbs_code, baseline_bac')
    .eq('project_id', projectId);
  if (res.error) return null;
  let sum = 0;
  let any = false;
  for (const r of (res.data ?? []) as Array<{ parent_wbs_code: string | null; baseline_bac: number | null }>) {
    if (r.parent_wbs_code && r.baseline_bac != null) { sum += Number(r.baseline_bac); any = true; }
  }
  return any ? sum : null;
}

async function loadResourceLoad(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  projectId: string,
): Promise<LoadResult> {
  const res = await supabase
    .from('resource_assignments')
    .select('resource_role, period, planned_work_hours')
    .eq('project_id', projectId)
    .limit(20000);
  if (res.error) return { months: [], roles: [], ready: false };
  return computeLoad((res.data ?? []) as ResAssignment[], false);
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { tab: initialTab } = await searchParams;

  const resolved = await getSessionRole();
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (!project) notFound();
  const projectType = ((project.project_type as ProjectType | undefined) ?? 'revenue');
  if (!roleSees(resolved.role, projectType)) notFound();
  const isIt = projectType === 'it';

  // Stage-gate state (non-revenue projects): template, decisions, sanction events, bucket allocation.
  let gates: GatesPanelProps['gates'] | undefined;
  if (isIt) {
    const [tplRes, decRes, seRes, allocRes, recRes, dispRes, benRes, governance] = await Promise.all([
      project.stage_template_id ? supabase.from('stage_templates').select('*').eq('id', project.stage_template_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('gate_decisions').select('*').eq('project_id', project.id).order('decided_on', { ascending: true }),
      supabase.from('sanction_events').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      project.fiscal_year && project.portfolio_bucket
        ? supabase.from('portfolio_allocations').select('*').eq('project_type', 'it').eq('fiscal_year', project.fiscal_year).eq('bucket', project.portfolio_bucket).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('decision_records').select('*').eq('project_id', project.id).order('proposed_at', { ascending: false }),
      supabase.from('resource_displacements').select('*').eq('from_project_id', project.id).order('from_date', { ascending: false }),
      supabase.from('benefits_reports').select('*').eq('project_id', project.id).order('period', { ascending: true }),
      loadGovernance(supabase, 'it'),
    ]);
    gates = {
      project,
      template: (tplRes.data as StageTemplate | null) ?? null,
      decisions: (decRes.data ?? []) as GateDecision[],
      sanctionEvents: (seRes.data ?? []) as SanctionEvent[],
      allocation: (allocRes.data as PortfolioAllocation | null) ?? null,
      records: (recRes.data ?? []) as DecisionRecord[],
      matrix: governance.matrix,
      gov: { bodies: governance.bodies, myBodyKeys: bodiesFor(governance, resolved.role), myRoleId: resolved.role.id, myRoleType: resolved.role.role_type, myName: resolved.role.name },
      displacements: (dispRes.data ?? []) as ResourceDisplacement[],
      benefits: (benRes.data ?? []) as BenefitsReport[],
    };
  }

  const [issuesRes, risksRes, cosRes, varianceRes, planningRows, actionItemsRes, forecastRes] = await Promise.all([
    supabase.from('issues').select('*').eq('project_id', project.id).order('opened_week', { ascending: true }),
    supabase.from('risks').select('*').eq('project_id', project.id).order('risk_id', { ascending: true }),
    supabase.from('change_orders').select('*').eq('project_id', project.id).order('co_id', { ascending: true }),
    supabase.from('variance_reports').select('*').eq('project_id', project.id).order('report_week', { ascending: true }),
    loadPlanningOutputs(supabase, project.id),
    // action_items may not exist yet (migration 0009). Query is resilient:
    // on error, .data is null and we fall back to an empty list below.
    supabase
      .from('action_items')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
    supabase.from('forecast_snapshots').select('*').eq('project_id', project.id).order('period', { ascending: true }),
  ]);

  const issues = issuesRes.data ?? [];
  const risks = risksRes.data ?? [];
  const change_orders = cosRes.data ?? [];
  const variance_reports = varianceRes.data ?? [];
  const planning_outputs = planningRows;
  const action_items = actionItemsRes.data ?? [];
  const forecastPoints = parseForecast(forecastRes.data ?? []);

  // Which planning artefacts already exist — drives the guided setup checklist.
  const doneAgents = Array.from(new Set(planning_outputs.map((o) => String(o.agent_type))));
  const isFreshProject = project.created_via === 'intake_form' || Number(project.current_week) === 0;
  const workPackages = await loadWorkPackages(supabase, project.id);
  const tasks = await loadTasks(supabase, project.id);
  const costActuals = await loadCostActuals(supabase, project.id);
  const resourceLoad = await loadResourceLoad(supabase, project.id);
  const soldBudget = await loadSoldBudget(supabase, project.id);
  const scheduleEnvelope = await loadScheduleEnvelope(supabase, project.id);
  const evLeaves = workPackages.filter((w) => w.parent_wbs_code);
  const evMetrics = computeEv(evLeaves, tasks, costActuals);
  const evC = evCurve(evLeaves, tasks, evMetrics.spi, evMetrics.cpi, evMetrics.eac);
  const wbsNames = new Map(workPackages.map((w) => [w.wbs_code, w.name]));
  const evByWbs = computeEvByWbs(evLeaves, tasks, costActuals, wbsNames);
  const evSchedule = evC ? earnedSchedule(evC, evMetrics.ev) : null;
  const purchaseOrders = await loadPurchaseOrders(supabase, project.id);
  const commitment = computeCommitment(purchaseOrders);
  const costElements = costByElement(costActuals);
  const labourRows = await loadLabourRows(supabase, project.id);
  const labourProductivity = computeLabourProductivity(labourRows);
  const labourByWbs = computeLabourByWbs(labourRows);
  const contractValue = Number(project.contract_value_current) || Number(project.sold_contract_value) || 0;
  const billing = computeBilling(await loadBilling(supabase, project.id), contractValue);
  const resultsAnalysis = computeResultsAnalysis(await loadResultsAnalysis(supabase, project.id), billing.byPhase);
  const marginBridge = computeMarginBridge({
    soldContract: Number(project.sold_contract_value) || 0,
    soldBudget: soldBudget ?? 0,
    currentContract: Number(project.contract_value_current) || 0,
    plannedBudget: evMetrics.bac,
    eac: evMetrics.eac,
  });

  const realisedCount = risks.filter((r) => String(r.status).toLowerCase().startsWith('realised')).length;
  const mitigatedCount = risks.filter((r) => String(r.status).toLowerCase().includes('mitigated')).length;
  const notMaterialisedCount = risks.filter((r) => String(r.status).toLowerCase().includes('not materialised')).length;
  const totalRiskClosure = realisedCount + mitigatedCount + notMaterialisedCount;

  // Latest variance — for CPI/SPI/contingency-consumed display
  const latestVariance = variance_reports.length > 0
    ? variance_reports[variance_reports.length - 1]
    : null;
  const currentCpi = latestVariance ? Number(latestVariance.cpi) : null;
  const currentSpi = latestVariance ? Number(latestVariance.spi) : null;
  const contingencyTotal = Number(project.contingency);
  const contingencyConsumed = latestVariance ? Number(latestVariance.contingency_consumed_m) * 1_000_000 : 0;
  const contingencyConsumedPct = contingencyTotal > 0 ? Math.min(100, (contingencyConsumed / contingencyTotal) * 100) : 0;

  // Open H-severity issues
  const openHIssues = issues.filter((i) => i.severity === 'H' && (i.status === 'Open' || i.status === 'In progress')).length;

  const ss = segmentStyle(project.segment);

  // Tone helpers for CPI/SPI
  const cpiTone = currentCpi === null ? 'neutral' : currentCpi < 0.95 ? 'warn' : currentCpi >= 1 ? 'ok' : 'neutral';
  const spiTone = currentSpi === null ? 'neutral' : currentSpi < 0.95 ? 'warn' : currentSpi >= 1 ? 'ok' : 'neutral';

  function toneCls(t: 'ok' | 'warn' | 'neutral'): string {
    return t === 'warn' ? 'text-red-600' : t === 'ok' ? 'text-emerald-700' : 'text-foreground';
  }

  function cardTone(t: 'ok' | 'warn' | 'neutral'): string {
    return t === 'warn' ? 'border-red-300 bg-red-50/50' : t === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : 'bg-card';
  }

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-8" data-project-code={project.code} data-project-type={project.project_type ?? 'revenue'} data-project-name={project.name}>
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={isIt ? '/portfolio/it' : '/dashboard'} className="hover:underline">{isIt ? 'IT portfolio' : 'Portfolio'}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{project.name}</span>
      </nav>

      <header className={`relative overflow-hidden rounded-xl border p-6 shadow-sm ${isIt ? 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/40' : 'bg-card'}`}>
        <span className={`absolute left-0 top-0 h-full w-1.5 ${isIt ? bucketStyle(project.portfolio_bucket).accentBar : ss.accentBar}`} />
        <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{project.code} · {project.client}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(project.status)}`}>
            {isIt ? lifecycleLabel(project.lifecycle_status) : `${project.status} · Week ${project.current_week}`}
          </span>
        </div>

        {isIt && gates ? (
          <div className="mt-6 grid grid-cols-2 gap-3 pl-2 sm:grid-cols-3 lg:grid-cols-6">
            <HeaderCard label="Bucket" value={bucketLabel(project.portfolio_bucket)} sub={`FY${project.fiscal_year ?? '—'}`} accent={bucketStyle(project.portfolio_bucket).hex} />
            <HeaderCard label="Category" value={categoryLabel(project.project_category)} sub={gates.template?.name ?? 'no template'} accent="#475569" />
            <HeaderCard label="Stage" value={(() => { const st = stageAt(gates.template, project.current_stage ?? 0); return st ? `${st.seq}. ${st.name}` : '—'; })()} sub={stageAt(gates.template, project.current_stage ?? 0)?.gate_name ?? ''} accent="#0284c7" />
            <HeaderCard label="Requested" value={fmtMoney(project.requested_budget)} sub={project.business_case?.value_type ? String(project.business_case.value_type).replace(/_/g, ' ') : ''} accent="#4f46e5" />
            <HeaderCard label={Number(project.approved_budget_current) > 0 && Number(project.approved_budget_current) !== Number(project.approved_budget_initial) ? 'Current budget' : 'Baseline'} value={Number(project.approved_budget_current) > 0 ? fmtMoney(project.approved_budget_current) : 'not locked'} sub={Number(project.approved_budget_current) > 0 ? (Number(project.approved_budget_current) !== Number(project.approved_budget_initial) ? `${fmtMoney(project.approved_budget_initial)} at Stage Gate 1 + ${fmtMoney(Number(project.approved_budget_current) - Number(project.approved_budget_initial))} approved changes` : 'locked at Stage Gate 1') : 'locks at Stage Gate 1'} tone={Number(project.approved_budget_current) > 0 ? 'ok' : 'neutral'} />
            <HeaderCard label="Open H-issues" value={String(openHIssues)} sub={`${risks.length} risks · ${issues.length} issues`} tone={openHIssues > 0 ? 'warn' : 'neutral'} />
          </div>
        ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 pl-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Segment</p>
            <p className="mt-1 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${ss.dot}`} />
                {ss.label}
              </span>
            </p>
          </div>
          <div className="rounded-md border border-sky-200 bg-sky-50/40 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contract</p>
            <p className="mt-1 text-base font-semibold tabular-nums">${(Number(project.contract_value_current) / 1_000_000).toFixed(2)}M</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Budget ${(Number(project.approved_budget_current) / 1_000_000).toFixed(2)}M</p>
          </div>
          <div className={`rounded-md border p-3 ${cardTone(cpiTone)}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">CPI</p>
            <p className={`mt-1 text-base font-semibold tabular-nums ${toneCls(cpiTone)}`}>{currentCpi !== null ? currentCpi.toFixed(2) : '—'}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Cost performance</p>
          </div>
          <div className={`rounded-md border p-3 ${cardTone(spiTone)}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">SPI</p>
            <p className={`mt-1 text-base font-semibold tabular-nums ${toneCls(spiTone)}`}>{currentSpi !== null ? currentSpi.toFixed(2) : '—'}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Schedule performance</p>
          </div>
          <div className={`rounded-md border p-3 ${contingencyConsumedPct > 75 ? 'border-red-300 bg-red-50/50' : contingencyConsumedPct > 50 ? 'border-amber-300 bg-amber-50/50' : 'bg-card'}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contingency</p>
            <p className="mt-1 text-base font-semibold tabular-nums">${(contingencyTotal / 1_000_000).toFixed(2)}M</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${contingencyConsumedPct > 75 ? 'bg-red-500' : contingencyConsumedPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${contingencyConsumedPct}%` }} />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{contingencyConsumedPct.toFixed(0)}% consumed</p>
          </div>
          <div className={`rounded-md border p-3 ${openHIssues > 0 ? 'border-amber-300 bg-amber-50/50' : 'bg-card'}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risk closeout</p>
            {totalRiskClosure > 0 ? (
              <>
                <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="bg-red-500" style={{ width: `${(realisedCount / totalRiskClosure) * 100}%` }} title={`Realised: ${realisedCount}`} />
                  <div className="bg-emerald-500" style={{ width: `${(mitigatedCount / totalRiskClosure) * 100}%` }} title={`Mitigated: ${mitigatedCount}`} />
                  <div className="bg-gray-400" style={{ width: `${(notMaterialisedCount / totalRiskClosure) * 100}%` }} title={`Not materialised: ${notMaterialisedCount}`} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  <span className="text-red-600">{realisedCount} R</span> · <span className="text-emerald-700">{mitigatedCount} M</span> · {notMaterialisedCount} NM
                </p>
                {openHIssues > 0 && (
                  <p className="mt-0.5 text-[10px] text-red-600">⚠ {openHIssues} open H-issue{openHIssues === 1 ? '' : 's'}</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No closure data yet</p>
            )}
          </div>
        </div>
        )}
        {project.hard_deadline_description && (
          <div className="relative mt-5 overflow-hidden rounded-lg border-2 border-amber-400 bg-gradient-to-r from-amber-100 via-amber-50 to-white px-4 py-3 shadow-sm">
            <span className="absolute left-0 top-0 h-full w-1.5 bg-amber-500" />
            <div className="flex items-center gap-3 pl-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-4 ring-amber-200/70">
                <span className="text-lg leading-none" aria-hidden="true">⏱</span>
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  <span aria-hidden="true">⚠</span> Hard deadline
                </p>
                <p className="text-base font-semibold text-amber-950">
                  {project.hard_deadline_description}
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {isIt && gates && (() => {
        const items: Array<{ tone: 'decide' | 'concur' | 'todo' | 'warn'; text: string; href: string; cta: string }> = [];
        for (const r of gates.records) {
          const a = isActionableBy(r, gates.gov.myBodyKeys);
          if (a === 'decide') items.push({ tone: 'decide', text: `Decide: ${r.title} (${fmtMoney(r.amount)}) — as ${gates.gov.bodies.find((b) => b.key === r.required_body_key)?.name ?? r.required_body_key}`, href: `/projects/${encodeURIComponent(code)}?tab=gates`, cta: 'Open decision' });
          if (a === 'concur') items.push({ tone: 'concur', text: `Concur: ${r.title} (${fmtMoney(r.amount)}) — Finance sign-off before the ${gates.gov.bodies.find((b) => b.key === r.required_body_key)?.name ?? 'body'} can decide`, href: `/projects/${encodeURIComponent(code)}?tab=gates`, cta: 'Review and concur' });
        }
        const canRun = ['it_pm', 'it_portfolio_manager'].includes(resolved.role.role_type);
        const running = project.lifecycle_status === 'active' || project.lifecycle_status === 'on_hold';
        const nextFy = ((project.fiscal_years_approved ?? []).length ? Math.max(...(project.fiscal_years_approved ?? [])) : (project.fiscal_year ?? new Date().getFullYear())) + 1;
        const askingNext = project.fiscal_year === nextFy;
        if (canRun && running && !askingNext && !(project.fiscal_years_approved ?? []).includes(nextFy) && new Date().getMonth() >= 6) items.push({ tone: 'todo', text: `FY${nextFy} continuation slice not yet requested — budgets are approved by year; without a request this project stops at year-end.`, href: `/projects/${encodeURIComponent(code)}?tab=overview`, cta: 'Request the slice' });
        const hold = gates.decisions.filter((d) => d.decision === 'hold').sort((a, b) => (a.decided_on < b.decided_on ? 1 : -1))[0];
        if (project.lifecycle_status === 'on_hold' && hold?.hold_until && new Date(hold.hold_until) < new Date()) items.push({ tone: 'warn', text: `Hold expired on ${hold.hold_until} — it must re-enter through the continuation gate or be cancelled; it does not drift.`, href: `/projects/${encodeURIComponent(code)}?tab=gates`, cta: 'Open gates' });
        if (canRun && project.lifecycle_status === 'approved') items.push({ tone: 'todo', text: 'Envelope granted at the waterline — the discovery allowance is released; assemble the Stage Gate 1 package to lock scope, budget and the capital / expense split.', href: `/projects/${encodeURIComponent(code)}?tab=gates`, cta: 'Go to the gate' });
        if (items.length === 0) return null;
        const toneCls = { decide: 'border-teal-300 bg-teal-50', concur: 'border-sky-300 bg-sky-50', todo: 'border-amber-300 bg-amber-50', warn: 'border-red-300 bg-red-50' } as const;
        const dot = { decide: 'bg-teal-600', concur: 'bg-sky-600', todo: 'bg-amber-500', warn: 'bg-red-600' } as const;
        return (
          <section className="mt-4 rounded-xl border-2 border-teal-400/60 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">Action needed from you</span>
              <span className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? 's' : ''} on this project · signed in as {resolved.role.name}, {resolved.definition.display_name}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {items.map((it, i) => (
                <li key={i} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${toneCls[it.tone]}`}>
                  <span className="inline-flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[it.tone]}`} />{it.text}</span>
                  <Link href={it.href} className="shrink-0 rounded-md bg-foreground px-3 py-1 text-xs font-semibold text-background transition hover:opacity-90">{it.cta} →</Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {/* The planning artefacts belong to Discover / Define. Once an IT project
          has passed its commit gate the checklist is historical: show it only if
          something was actually produced, and never nag a role that cannot run it. */}
      {(() => {
        const itCommitted = isIt && gates ? isCommitted(gates.template, gates.decisions) : false;
        const canRunAny = (['charter_drafter', 'stakeholder_analyst', 'wbs_builder', 'schedule_reasoner', 'budget_builder', 'communications_planner'] as const).some((a) => resolved.definition.allowed_agents.includes(a));
        if (itCommitted && doneAgents.length === 0) return null;
        if (!canRunAny && doneAgents.length === 0) return null;
        return (
          <SetupChecklist
            projectCode={code}
            projectName={String(project.name)}
            done={doneAgents}
            allowedAgents={resolved.definition.allowed_agents}
            defaultOpen={!itCommitted && isFreshProject && doneAgents.length < 6}
          />
        );
      })()}


      <ProjectTabs
        initialTab={initialTab}
        projectCode={code}
        allowedAgents={resolved.definition.allowed_agents}
        canWrite={resolved.definition.can_write}
        contingencyTotal={contingencyTotal}
        contingencyConsumed={contingencyConsumed}
        projectCurrentWeek={Number(project.current_week)}
        projectStatus={String(project.status)}
        projectHardDeadline={project.hard_deadline_description ?? null}
        workPackages={workPackages}
        tasks={tasks}
        projectAppNative={(project.source_system ?? 'APP') !== 'SAP_PS'}
        evMetrics={evMetrics}
        evCurve={evC}
        evSyncedAt={costActuals.find((c) => c.synced_at)?.synced_at ?? null}
        evByWbs={evByWbs}
        forecastPoints={forecastPoints}
        evSchedule={evSchedule}
        commitment={commitment}
        costElements={costElements}
        labourProductivity={labourProductivity}
        labourByWbs={labourByWbs}
        purchaseOrders={purchaseOrders}
        billing={billing}
        resultsAnalysis={resultsAnalysis}
        resourceLoad={resourceLoad}
        marginBridge={marginBridge}
        marginSyncedAt={project.baseline_captured_at ?? null}
        scheduleEnvelope={scheduleEnvelope}
        projectType={projectType}
        gates={gates}
        data={{ issues, risks, change_orders, variance_reports, planning_outputs, action_items }}
      />
    </div>
  );
}


function HeaderCard({ label, value, sub, tone = 'neutral', accent }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'neutral'; accent?: string }) {
  const cls = tone === 'warn' ? 'border-amber-300 bg-amber-50/50' : tone === 'ok' ? 'border-emerald-200 bg-emerald-50/50' : 'bg-white/80';
  return (
    <div className={`rounded-md border p-3 ${cls}`} style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <p className="text-[10px] font-medium uppercase tracking-wider" style={accent ? { color: accent } : undefined}>{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
