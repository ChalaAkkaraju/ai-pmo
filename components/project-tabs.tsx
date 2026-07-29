'use client';

/**
 * Unified project workspace — the single tabbed home for everything about one
 * project. One URL, one floating assistant, fast tab switches; the synthesis
 * story (cost + schedule + structure are one picture) stays intact.
 *
 * Top-level tabs:
 *   Overview     — the executive read: EV headline + what needs attention.
 *   Structure    — canonical WBS tree (synced from SAP PS).
 *   Schedule     — canonical Gantt + task list (Microsoft Project / P6).
 *   Earned value — full EV card + S-curve (flagship).
 *   Risks & issues — heat map + risk register + issue register.
 *   Changes      — change orders.
 *   Variance     — contingency-burn trend + variance summary.
 *   Planning     — AI planning artefacts (charter, stakeholders, …) via an
 *                  inner selector so the top bar stays clean.
 *
 * Agent invocation lives in the floating widget (bottom-right of every page).
 * Tabs are controlled so the Overview can link straight into a deeper tab.
 */

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { IssuesTable } from './issues-table';
import { IssueHealthPanel } from './issue-health-panel';
import { IssueHeatmap } from './issue-heatmap';
import { RisksTable } from './risks-table';
import { RiskHeatmap } from './risk-heatmap';
import { RiskExposurePanel } from './risk-exposure-panel';
import { ChangeOrdersTable } from './change-orders-table';
import { ChangeOrdersPanel } from './change-orders-panel';
import { VarianceSummary } from './variance-summary';
import { VarianceTrendChart } from './variance-trend-chart';
import { WbsCanonicalTree, type WorkPackage } from './wbs-canonical-tree';
import { RiskByWbs } from './risk-by-wbs';
import { IssueByWbs } from './issue-by-wbs';
import { WbsAuthoring } from './wbs-authoring';
import { ScheduleView, type Task } from './schedule-view';
import { EarnedValueCard } from './earned-value-card';
import { EvByWbs } from './ev-by-wbs';
import { ForecastTrend } from './forecast-trend';
import { toneCard, toneText, type KpiTone } from '@/lib/kpi-tone';
import { CashFlow } from './cash-flow';
import { CostTab } from './cost-tab';
import { RiskIssuesTab } from './risk-issues-tab';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, ListTree, CalendarDays, LineChart, Receipt,
  FileSignature, Users, ShieldAlert, Replace, Activity, ClipboardList,
  ScrollText, Wallet, Megaphone, GraduationCap, PackageCheck,
} from 'lucide-react';
import { CommitmentPanel } from './commitment-panel';
import { CostElementMix } from './cost-element-mix';
import { CostByWbs } from './cost-by-wbs';
import { RevenueRecognitionPanel } from './revenue-recognition-panel';
import { PoTable } from './po-table';
import { LabourProductivityPanel } from './labour-productivity-panel';
import { LabourByWbs } from './labour-by-wbs';
import { ResourceLoadPanel } from './resource-load-view';
import { MarginBridgeCard } from './margin-bridge';
import { PlanningArtefactView, type ArtefactRow } from './planning-artefact-view';
import type { EvMetrics, EvCurve, EvBranch, EarnedScheduleMetrics } from '@/lib/earned-value';
import type { ForecastPoint } from '@/lib/forecast';
import type { CommitmentSummary, PoRow, LabourProductivity } from '@/lib/cost-commitment';
import type { BillingSummary } from '@/lib/billing';
import type { RaSummary } from '@/lib/results-analysis';
import type { LabourByWbsRow } from '@/lib/cost-commitment';
import type { LoadResult } from '@/lib/resource-load';
import type { MarginBridge } from '@/lib/margin';
import type { AgentType } from '@/lib/types';

/** AI planning artefacts, shown inside the Planning tab via an inner selector. */
const PLANNING_TABS: Array<{ value: string; label: string; agentType: AgentType; Icon: LucideIcon; iconOn: string; activeBtn: string; edge: string }> = [
  { value: 'charter', label: 'Charter', agentType: 'charter_drafter', Icon: ScrollText, iconOn: 'text-blue-600', activeBtn: 'border-blue-300 bg-blue-50 text-blue-800', edge: 'border-blue-300' },
  { value: 'stakeholders', label: 'Stakeholders', agentType: 'stakeholder_analyst', Icon: Users, iconOn: 'text-cyan-600', activeBtn: 'border-cyan-300 bg-cyan-50 text-cyan-800', edge: 'border-cyan-300' },
  { value: 'budget', label: 'Budget', agentType: 'budget_builder', Icon: Wallet, iconOn: 'text-emerald-600', activeBtn: 'border-emerald-300 bg-emerald-50 text-emerald-800', edge: 'border-emerald-300' },
  { value: 'comms', label: 'Comms', agentType: 'communications_planner', Icon: Megaphone, iconOn: 'text-violet-600', activeBtn: 'border-violet-300 bg-violet-50 text-violet-800', edge: 'border-violet-300' },
  { value: 'lessons', label: 'Lessons', agentType: 'lessons_learned_synthesiser', Icon: GraduationCap, iconOn: 'text-amber-600', activeBtn: 'border-amber-300 bg-amber-50 text-amber-800', edge: 'border-amber-300' },
  { value: 'closeout', label: 'Closeout', agentType: 'closeout_reporter', Icon: PackageCheck, iconOn: 'text-rose-600', activeBtn: 'border-rose-300 bg-rose-50 text-rose-800', edge: 'border-rose-300' },
];

interface ProjectTabsProps {
  initialTab?: string;
  projectCode: string;
  allowedAgents: AgentType[];
  canWrite: boolean;
  contingencyTotal: number;
  contingencyConsumed: number;
  projectCurrentWeek: number;
  projectStatus: string;
  projectHardDeadline: string | null;
  /** Canonical structure + schedule (mirrored from SAP PS / scheduler). */
  workPackages: WorkPackage[];
  tasks: Task[];
  /** Project not yet sourced from SAP — eligible for AI WBS authoring + booking. */
  projectAppNative: boolean;
  /** Earned-value engine output + S-curve, plus the cost-actual sync time. */
  evMetrics: EvMetrics;
  evCurve: EvCurve | null;
  evSyncedAt: string | null;
  evByWbs: EvBranch[];
  evSchedule: EarnedScheduleMetrics | null;
  forecastPoints: ForecastPoint[];
  commitment: CommitmentSummary;
  costElements: { category: string; actual: number; planned: number }[];
  labourProductivity: LabourProductivity;
  labourByWbs: LabourByWbsRow[];
  purchaseOrders: PoRow[];
  billing: BillingSummary;
  resultsAnalysis: RaSummary;
  resourceLoad: LoadResult;
  marginBridge: MarginBridge;
  marginSyncedAt: string | null;
  scheduleEnvelope: { forecastFinish: string | null; targetFinish: string | null; breachDays: number | null };
  data: {
    issues: Array<Record<string, unknown>>;
    risks: Array<Record<string, unknown>>;
    change_orders: Array<Record<string, unknown>>;
    variance_reports: Array<Record<string, unknown>>;
    planning_outputs: ArtefactRow[];
    action_items?: Array<Record<string, unknown>>;
  };
}

export function ProjectTabs({
  initialTab,
  projectCode,
  allowedAgents,
  canWrite,
  contingencyTotal,
  contingencyConsumed,
  projectCurrentWeek,
  projectStatus,
  projectHardDeadline,
  workPackages,
  tasks,
  projectAppNative,
  evMetrics,
  evCurve,
  evSyncedAt,
  evByWbs,
  evSchedule,
  forecastPoints,
  commitment,
  costElements,
  labourProductivity,
  labourByWbs,
  purchaseOrders,
  billing,
  resultsAnalysis,
  resourceLoad,
  marginBridge,
  marginSyncedAt,
  scheduleEnvelope,
  data,
}: ProjectTabsProps) {
  const [tab, setTab] = useState(['overview', 'structure', 'schedule', 'ev', 'cost', 'resources', 'risks', 'cos', 'variance', 'planning'].includes(initialTab ?? '') ? (initialTab as string) : 'overview');

  const planningByAgent: Record<string, ArtefactRow[]> = {};
  for (const row of data.planning_outputs ?? []) {
    if (!planningByAgent[row.agent_type]) planningByAgent[row.agent_type] = [];
    planningByAgent[row.agent_type].push(row);
  }
  const planningCount = PLANNING_TABS.reduce((n, t) => n + (planningByAgent[t.agentType]?.length ?? 0), 0);
  const activeWps = workPackages.filter((w) => (w.status ?? 'active') !== 'proposed');
  const proposedWps = workPackages.filter((w) => w.status === 'proposed');

  return (
    <Tabs.Root value={tab} onValueChange={setTab} className="mt-8">
      <Tabs.List className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b">
        <TabTrigger value="overview" label="Overview" />
        <TabTrigger value="structure" label="Structure" count={workPackages.length} />
        <TabTrigger value="schedule" label="Schedule" count={tasks.length} />
        <TabTrigger value="ev" label="Earned value" highlight />
        <TabTrigger value="cost" label="Cost" />
        <TabTrigger value="resources" label="Resources" count={resourceLoad.roles.length} />
        <span className="mx-2 self-center text-muted-foreground/40">|</span>
        <TabTrigger value="risks" label="Risks & issues" count={data.risks.length + data.issues.length} />
        <TabTrigger value="cos" label="Changes & trends" count={data.change_orders.length} />
        <TabTrigger value="variance" label="Variance" count={data.variance_reports.length} />
        <TabTrigger value="planning" label="Planning" count={planningCount} dimWhenEmpty />
      </Tabs.List>

      <Tabs.Content value="overview" className="pt-6">
        <OverviewPanel
          metrics={evMetrics}
          status={projectStatus}
          currentWeek={projectCurrentWeek}
          risks={data.risks}
          issues={data.issues}
          actions={data.action_items ?? []}
          marginBridge={marginBridge}
          marginSyncedAt={marginSyncedAt}
          scheduleEnvelope={scheduleEnvelope}
          go={setTab}
        />
      </Tabs.Content>

      <Tabs.Content value="structure" className="space-y-6 pt-6">
        {activeWps.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <WbsCanonicalTree workPackages={activeWps} />
            <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
              <RiskByWbs risks={data.risks} workPackages={activeWps} />
              <IssueByWbs issues={data.issues} workPackages={activeWps} />
            </div>
          </div>
        ) : proposedWps.length > 0 ? (
          <>
            {canWrite && <WbsAuthoring projectCode={projectCode} proposed />}
            <WbsCanonicalTree workPackages={proposedWps} mode="proposed" />
          </>
        ) : projectAppNative && canWrite ? (
          <WbsAuthoring projectCode={projectCode} proposed={false} />
        ) : (
          <WbsCanonicalTree workPackages={[]} />
        )}
      </Tabs.Content>

      <Tabs.Content value="schedule" className="space-y-6 pt-6">
        <ScheduleView tasks={tasks} workPackages={workPackages} />
        {tasks.length === 0 && (
          <PlanningAside rows={planningByAgent['schedule_reasoner'] ?? []} label="Schedule" canEdit={canWrite} />
        )}
      </Tabs.Content>

      <Tabs.Content value="ev" className="space-y-6 pt-6">
        <EarnedValueCard metrics={evMetrics} syncedAt={evSyncedAt} curve={evCurve} es={evSchedule} />
        <EvByWbs branches={evByWbs} />
        <ForecastTrend points={forecastPoints} />
      </Tabs.Content>

      <Tabs.Content value="cost" className="pt-6">
        <CostTab
          costToDate={
            <>
              <CostElementMix elements={costElements} commitment={commitment} />
              <CostByWbs branches={evByWbs} commitment={commitment} billing={billing} />
            </>
          }
          commitment={
            <>
              <CommitmentPanel metrics={evMetrics} commitment={commitment} />
              <PoTable pos={purchaseOrders} workPackages={workPackages} />
            </>
          }
          revenue={<RevenueRecognitionPanel ra={resultsAnalysis} billing={billing} workPackages={workPackages} />}
          cashFlow={<CashFlow points={forecastPoints} finishIso={scheduleEnvelope.forecastFinish ?? scheduleEnvelope.targetFinish} />}
        />
      </Tabs.Content>

      <Tabs.Content value="resources" className="space-y-6 pt-6">
        <LabourProductivityPanel p={labourProductivity} />
        <LabourByWbs rows={labourByWbs} workPackages={workPackages} />
        <ResourceLoadPanel
          load={resourceLoad}
          mode="project"
          title="Resource demand by discipline"
          subtitle="One chart per discipline — FTE demand across the project timeline · from the scheduler, read-only"
        />
      </Tabs.Content>

      <Tabs.Content value="risks" className="pt-6">
        <RiskIssuesTab
          risks={
            <>
              <RiskExposurePanel risks={data.risks} contingency={contingencyTotal} consumed={contingencyConsumed} />
              <RiskHeatmap rows={data.risks} />
              <RisksTable rows={data.risks} actions={data.action_items ?? []} issues={data.issues} />
            </>
          }
          issues={
            <>
              <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
                <IssueHealthPanel issues={data.issues} currentWeek={projectCurrentWeek} />
                <IssueHeatmap rows={data.issues} currentWeek={projectCurrentWeek} />
              </div>
              <IssuesTable rows={data.issues} currentWeek={projectCurrentWeek} />
            </>
          }
        />
      </Tabs.Content>

      <Tabs.Content value="cos" className="pt-6">
        <ChangeOrdersPanel rows={data.change_orders} soldContract={marginBridge.soldContract} baseMarginPct={marginBridge.soldMarginPct} />
        <ChangeOrdersTable rows={data.change_orders} />
      </Tabs.Content>

      <Tabs.Content value="variance" className="space-y-6 pt-6">
        <VarianceTrendChart rows={data.variance_reports} contingencyTotal={contingencyTotal} />
        <VarianceSummary rows={data.variance_reports} />
      </Tabs.Content>

      <Tabs.Content value="planning" className="pt-6">
        <PlanningPanel byAgent={planningByAgent} canEdit={canWrite} />
      </Tabs.Content>
    </Tabs.Root>
  );
}

/* ---------------------------------------------------------------- Overview */

function fmtM(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
}
function ratioTone(v: number | null): string {
  return v == null ? 'text-foreground' : v < 0.95 ? 'text-red-600' : v >= 1.0 ? 'text-emerald-700' : 'text-amber-700';
}

function ratioToneKpi(v: number | null): KpiTone {
  return v == null ? 'neutral' : v < 0.95 ? 'bad' : v >= 1.0 ? 'ok' : 'warn';
}

function OverviewPanel({
  metrics,
  status,
  currentWeek,
  risks,
  issues,
  actions,
  marginBridge,
  marginSyncedAt,
  scheduleEnvelope,
  go,
}: {
  metrics: EvMetrics;
  status: string;
  currentWeek: number;
  risks: Array<Record<string, unknown>>;
  issues: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  marginBridge: MarginBridge;
  marginSyncedAt: string | null;
  scheduleEnvelope: { forecastFinish: string | null; targetFinish: string | null; breachDays: number | null };
  go: (tab: string) => void;
}) {
  const closedRisk = (s: string) => ['mitigated', 'realised', 'realized', 'not materialised', 'not materialized', 'closed', 'retired'].some((k) => s.includes(k));
  const openRisks = risks.filter((r) => !closedRisk(String(r.status ?? '').toLowerCase())).length;
  const openIssues = issues.filter((i) => {
    const s = String(i.status ?? '').toLowerCase();
    return s === 'open' || s.includes('progress');
  }).length;
  const openActions = actions.filter((a) => {
    const s = String(a.status ?? '').toLowerCase();
    return !(s.includes('done') || s.includes('closed') || s.includes('complete') || s.includes('resolved') || s.includes('declined'));
  }).length;

  const cpi = metrics.ready ? metrics.cpi : null;
  const spi = metrics.ready ? metrics.spi : null;
  const sched = spi == null ? null : spi < 0.97 ? 'behind schedule' : spi > 1.03 ? 'ahead of schedule' : 'on schedule';
  const cost = cpi == null ? null : cpi < 0.97 ? 'over cost' : cpi > 1.03 ? 'under cost' : 'on budget';
  const trouble = (cpi != null && cpi < 0.97) || (spi != null && spi < 0.97);
  const great = cpi != null && cpi >= 1.0 && spi != null && spi >= 1.0;
  const readChip = trouble ? 'bg-red-100 text-red-800' : great ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
  const readout = [sched, cost].filter(Boolean).join(' · ') || 'in progress';

  return (
    <div className="space-y-5">
      {/* Health line */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{status} · Week {currentWeek}</span>
        {metrics.ready && <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums">{metrics.complete_pct.toFixed(0)}% complete</span>}
        {(sched || cost) && <span className={`rounded-full px-3 py-1 text-xs font-medium ${readChip}`}>{readout}</span>}
        {scheduleEnvelope.breachDays != null && (
          scheduleEnvelope.breachDays > 0
            ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">⚠ {scheduleEnvelope.breachDays}d past target finish</span>
            : <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">within target finish</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Performance snapshot */}
        <button
          type="button"
          onClick={() => go('ev')}
          className="group rounded-lg border bg-gradient-to-br from-emerald-50/40 via-card to-card p-4 text-left transition hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Earned value</p>
            <span className="text-xs text-muted-foreground group-hover:text-foreground">Open →</span>
          </div>
          {metrics.ready ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label="Complete" value={`${metrics.complete_pct.toFixed(0)}%`} />
              <Kpi label="CPI · cost" value={metrics.cpi == null ? '—' : metrics.cpi.toFixed(2)} tone={ratioToneKpi(metrics.cpi)} />
              <Kpi label="SPI · sched" value={metrics.spi == null ? '—' : metrics.spi.toFixed(2)} tone={ratioToneKpi(metrics.spi)} />
              <Kpi label="Forecast" value={fmtM(metrics.eac)} />
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Earned value not computed yet — run the cost sync.</p>
          )}
        </button>

        {/* Needs attention */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold">Needs attention</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <AttnRow label="Open risks" n={openRisks} onClick={() => go('risks')} />
            <AttnRow label="Open issues" n={openIssues} onClick={() => go('risks')} />
            <AttnRow label="Open actions" n={openActions} onClick={() => go('risks')} />
          </div>
          {openRisks + openIssues + openActions === 0 && (
            <p className="mt-3 text-xs text-emerald-700">Nothing open — all clear.</p>
          )}
        </div>
      </div>

      {marginBridge.ready && <MarginBridgeCard bridge={marginBridge} syncedAt={marginSyncedAt} />}

      <p className="text-xs text-muted-foreground">
        Tip: the tabs above hold the detail — structure (WBS), schedule, the full earned-value S-curve, and the AI planning artefacts.
      </p>
    </div>
  );
}

function Kpi({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: KpiTone }) {
  return (
    <div className={`rounded-md border px-3 py-1.5 ${toneCard(tone)}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${toneText(tone)}`}>{value}</p>
    </div>
  );
}

function AttnRow({ label, n, onClick }: { label: string; n: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-left transition hover:shadow-sm ${n > 0 ? 'border-amber-300 bg-amber-50/60' : 'bg-card'}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${n > 0 ? 'text-amber-700' : 'text-foreground'}`}>{n}</p>
    </button>
  );
}

/* ------------------------------------------------------ AI write-up aside */

function PlanningAside({ rows, label, canEdit }: { rows: ArtefactRow[]; label: string; canEdit: boolean }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span aria-hidden="true">✨</span> AI {label.toLowerCase()} write-up
      </p>
      <PlanningArtefactView rows={rows} artefactLabel={label} canEdit={canEdit} />
    </div>
  );
}

/* ---------------------------------------------------------------- Planning */

function PlanningPanel({ byAgent, canEdit }: { byAgent: Record<string, ArtefactRow[]>; canEdit: boolean }) {
  const firstWithContent = PLANNING_TABS.find((t) => (byAgent[t.agentType]?.length ?? 0) > 0)?.value ?? PLANNING_TABS[0].value;
  const [sel, setSel] = useState(firstWithContent);
  const active = PLANNING_TABS.find((t) => t.value === sel) ?? PLANNING_TABS[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PLANNING_TABS.map((t) => {
          const count = byAgent[t.agentType]?.length ?? 0;
          const on = t.value === sel;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setSel(t.value)}
              className={`group flex items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition ${
                on
                  ? `${t.activeBtn} shadow-sm`
                  : count > 0
                    ? 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    : 'border-transparent bg-muted/20 text-muted-foreground/50 hover:bg-muted/40'
              }`}
            >
              <t.Icon className={`h-4 w-4 shrink-0 ${on ? t.iconOn : count > 0 ? 'text-muted-foreground group-hover:text-foreground' : 'text-muted-foreground/40'}`} />
              <span className="text-sm font-semibold">{t.label}</span>
              {count > 0 && (
                <span className="rounded-full bg-background px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className={`border-l-2 pl-5 ${active.edge}`}>
        <PlanningArtefactView rows={byAgent[active.agentType] ?? []} artefactLabel={active.label} canEdit={canEdit} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Trigger */

/** Per-tab icon + accent colour. Active tab reveals its colour on icon + underline. */
const TAB_ACCENT: Record<string, { Icon: LucideIcon; idle: string; active: string; bar: string }> = {
  overview: { Icon: LayoutDashboard, idle: 'text-slate-500', active: 'group-data-[state=active]:text-slate-700', bar: 'bg-slate-500' },
  structure: { Icon: ListTree, idle: 'text-indigo-500', active: 'group-data-[state=active]:text-indigo-700', bar: 'bg-indigo-500' },
  schedule: { Icon: CalendarDays, idle: 'text-violet-500', active: 'group-data-[state=active]:text-violet-700', bar: 'bg-violet-500' },
  ev: { Icon: LineChart, idle: 'text-emerald-500', active: 'group-data-[state=active]:text-emerald-700', bar: 'bg-emerald-500' },
  cost: { Icon: Receipt, idle: 'text-amber-500', active: 'group-data-[state=active]:text-amber-700', bar: 'bg-amber-500' },
  commitment: { Icon: FileSignature, idle: 'text-orange-500', active: 'group-data-[state=active]:text-orange-700', bar: 'bg-orange-500' },
  resources: { Icon: Users, idle: 'text-cyan-500', active: 'group-data-[state=active]:text-cyan-700', bar: 'bg-cyan-500' },
  risks: { Icon: ShieldAlert, idle: 'text-red-500', active: 'group-data-[state=active]:text-red-700', bar: 'bg-red-500' },
  cos: { Icon: Replace, idle: 'text-fuchsia-500', active: 'group-data-[state=active]:text-fuchsia-700', bar: 'bg-fuchsia-500' },
  variance: { Icon: Activity, idle: 'text-rose-500', active: 'group-data-[state=active]:text-rose-700', bar: 'bg-rose-500' },
  planning: { Icon: ClipboardList, idle: 'text-blue-500', active: 'group-data-[state=active]:text-blue-700', bar: 'bg-blue-500' },
};

function TabTrigger({
  value,
  label,
  count,
  highlight,
  dimWhenEmpty,
}: {
  value: string;
  label: string;
  count?: number;
  highlight?: boolean;
  dimWhenEmpty?: boolean;
}) {
  const isEmpty = dimWhenEmpty && (count === undefined || count === 0);
  const accent = TAB_ACCENT[value];
  const Icon = accent?.Icon;
  return (
    <Tabs.Trigger
      value={value}
      className={`group relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition data-[state=active]:text-foreground hover:text-foreground ${
        highlight ? 'text-foreground' : isEmpty ? 'text-muted-foreground/50' : 'text-foreground/75'
      }`}
    >
      {Icon && (
        <Icon className={`h-4 w-4 shrink-0 transition ${isEmpty ? 'text-muted-foreground/40' : accent.idle} ${accent.active}`} />
      )}
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">{count}</span>
      )}
      <span className={`absolute bottom-0 left-0 right-0 h-0.5 opacity-0 transition data-[state=active]:opacity-100 ${accent?.bar ?? 'bg-foreground'}`} />
    </Tabs.Trigger>
  );
}
