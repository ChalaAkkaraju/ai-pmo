/**
 * Project detail page.
 *
 * Shows the project header (name, segment, contract, etc.) and tabbed views
 * for Issues / Risks / Change Orders / Variance / Planning artefacts /
 * Invoke Agent.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ProjectTabs } from '@/components/project-tabs';
import { SetupChecklist } from '@/components/setup-checklist';
import { AssignTaskButton } from '@/components/assign-task-button';
import type { WorkPackage } from '@/components/wbs-canonical-tree';
import type { Task } from '@/components/schedule-view';
import { computeEv, evCurve } from '@/lib/earned-value';
import { segmentStyle, statusBadge } from '@/lib/segment-style';

// Always fetch fresh from Supabase — no Next.js data cache
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string; code: string }>;
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
  const res = await supabase
    .from('work_packages')
    .select('wbs_code, parent_wbs_code, name, responsible_role_type, is_billing_element, budget_bac, source_system, synced_at')
    .eq('project_id', projectId);
  if (res.error) return [];
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
): Promise<Array<{ actual_cost: number | null; planned_value: number | null; synced_at: string | null }>> {
  const res = await supabase
    .from('cost_actuals')
    .select('actual_cost, planned_value, synced_at')
    .eq('project_id', projectId);
  if (res.error) return [];
  return res.data ?? [];
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { token, code } = await params;

  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (!project) notFound();

  const [issuesRes, risksRes, cosRes, varianceRes, planningRows, actionItemsRes] = await Promise.all([
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
  ]);

  const issues = issuesRes.data ?? [];
  const risks = risksRes.data ?? [];
  const change_orders = cosRes.data ?? [];
  const variance_reports = varianceRes.data ?? [];
  const planning_outputs = planningRows;
  const action_items = actionItemsRes.data ?? [];

  // Which planning artefacts already exist — drives the guided setup checklist.
  const doneAgents = Array.from(new Set(planning_outputs.map((o) => String(o.agent_type))));
  const isFreshProject = project.created_via === 'intake_form' || Number(project.current_week) === 0;
  const workPackages = await loadWorkPackages(supabase, project.id);
  const tasks = await loadTasks(supabase, project.id);
  const costActuals = await loadCostActuals(supabase, project.id);
  const evLeaves = workPackages.filter((w) => w.parent_wbs_code);
  const evMetrics = computeEv(evLeaves, tasks, costActuals);
  const evC = evCurve(evLeaves, tasks, evMetrics.spi, evMetrics.cpi);

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

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{project.name}</span>
      </nav>

      <header className="relative overflow-hidden rounded-lg border bg-card p-6">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${ss.accentBar}`} />
        <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{project.code} · {project.client}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(project.status)}`}>
            {project.status} · Week {project.current_week}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 pl-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md border bg-background/60 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Segment</p>
            <p className="mt-1 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${ss.dot}`} />
                {ss.label}
              </span>
            </p>
          </div>
          <div className="rounded-md border bg-background/60 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contract</p>
            <p className="mt-1 text-base font-semibold tabular-nums">${(Number(project.contract_value_current) / 1_000_000).toFixed(2)}M</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Budget ${(Number(project.approved_budget_current) / 1_000_000).toFixed(2)}M</p>
          </div>
          <div className={`rounded-md border bg-background/60 p-3 ${cpiTone === 'warn' ? 'border-red-300 bg-red-50/30' : ''}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">CPI</p>
            <p className={`mt-1 text-base font-semibold tabular-nums ${toneCls(cpiTone)}`}>{currentCpi !== null ? currentCpi.toFixed(2) : '—'}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Cost performance</p>
          </div>
          <div className={`rounded-md border bg-background/60 p-3 ${spiTone === 'warn' ? 'border-red-300 bg-red-50/30' : ''}`}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">SPI</p>
            <p className={`mt-1 text-base font-semibold tabular-nums ${toneCls(spiTone)}`}>{currentSpi !== null ? currentSpi.toFixed(2) : '—'}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Schedule performance</p>
          </div>
          <div className="rounded-md border bg-background/60 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contingency</p>
            <p className="mt-1 text-base font-semibold tabular-nums">${(contingencyTotal / 1_000_000).toFixed(2)}M</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${contingencyConsumedPct > 75 ? 'bg-red-500' : contingencyConsumedPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${contingencyConsumedPct}%` }} />
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{contingencyConsumedPct.toFixed(0)}% consumed</p>
          </div>
          <div className="rounded-md border bg-background/60 p-3">
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
        {project.hard_deadline_description && (
          <div className="mt-5 flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5">
            <span className="text-lg leading-none" aria-hidden="true">⏱</span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Hard deadline
              </p>
              <p className="text-sm font-medium text-amber-900">
                {project.hard_deadline_description}
              </p>
            </div>
          </div>
        )}
      </header>

      <SetupChecklist
        token={token}
        projectCode={code}
        projectName={String(project.name)}
        done={doneAgents}
        allowedAgents={resolved.definition.allowed_agents}
        defaultOpen={isFreshProject && doneAgents.length < 6}
      />

      {resolved.definition.can_write && <AssignTaskButton token={token} projectCode={code} />}

      <ProjectTabs
        token={token}
        projectCode={code}
        allowedAgents={resolved.definition.allowed_agents}
        canWrite={resolved.definition.can_write}
        contingencyTotal={contingencyTotal}
        projectCurrentWeek={Number(project.current_week)}
        projectStatus={String(project.status)}
        projectHardDeadline={project.hard_deadline_description ?? null}
        workPackages={workPackages}
        tasks={tasks}
        evMetrics={evMetrics}
        evCurve={evC}
        evSyncedAt={costActuals.find((c) => c.synced_at)?.synced_at ?? null}
        data={{ issues, risks, change_orders, variance_reports, planning_outputs, action_items }}
      />
    </div>
  );
}
