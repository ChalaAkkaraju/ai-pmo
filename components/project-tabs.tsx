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
import { RisksTable } from './risks-table';
import { RiskHeatmap } from './risk-heatmap';
import { ChangeOrdersTable } from './change-orders-table';
import { VarianceSummary } from './variance-summary';
import { VarianceTrendChart } from './variance-trend-chart';
import { WbsCanonicalTree, type WorkPackage } from './wbs-canonical-tree';
import { WbsAuthoring } from './wbs-authoring';
import { ScheduleView, type Task } from './schedule-view';
import { EarnedValueCard } from './earned-value-card';
import { ResourceLoadPanel } from './resource-load-view';
import { MarginBridgeCard } from './margin-bridge';
import { PlanningArtefactView, type ArtefactRow } from './planning-artefact-view';
import type { EvMetrics, EvCurve } from '@/lib/earned-value';
import type { LoadResult } from '@/lib/resource-load';
import type { MarginBridge } from '@/lib/margin';
import type { AgentType } from '@/lib/types';

/** AI planning artefacts, shown inside the Planning tab via an inner selector. */
const PLANNING_TABS: Array<{ value: string; label: string; agentType: AgentType }> = [
  { value: 'charter', label: 'Charter', agentType: 'charter_drafter' },
  { value: 'stakeholders', label: 'Stakeholders', agentType: 'stakeholder_analyst' },
  { value: 'budget', label: 'Budget', agentType: 'budget_builder' },
  { value: 'comms', label: 'Comms', agentType: 'communications_planner' },
  { value: 'lessons', label: 'Lessons', agentType: 'lessons_learned_synthesiser' },
  { value: 'closeout', label: 'Closeout', agentType: 'closeout_reporter' },
];

interface ProjectTabsProps {
  token: string;
  initialTab?: string;
  projectCode: string;
  allowedAgents: AgentType[];
  canWrite: boolean;
  contingencyTotal: number;
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
  token,
  initialTab,
  projectCode,
  allowedAgents,
  canWrite,
  contingencyTotal,
  projectCurrentWeek,
  projectStatus,
  projectHardDeadline,
  workPackages,
  tasks,
  projectAppNative,
  evMetrics,
  evCurve,
  evSyncedAt,
  resourceLoad,
  marginBridge,
  marginSyncedAt,
  scheduleEnvelope,
  data,
}: ProjectTabsProps) {
  const [tab, setTab] = useState(['overview', 'structure', 'schedule', 'ev', 'resources', 'risks', 'cos', 'variance', 'planning'].includes(initialTab ?? '') ? (initialTab as string) : 'overview');

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
        <TabTrigger value="resources" label="Resources" count={resourceLoad.roles.length} />
        <span className="mx-2 self-center text-muted-foreground/40">|</span>
        <TabTrigger value="risks" label="Risks & issues" count={data.risks.length + data.issues.length} />
        <TabTrigger value="cos" label="Changes" count={data.change_orders.length} />
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
          <WbsCanonicalTree workPackages={activeWps} />
        ) : proposedWps.length > 0 ? (
          <>
            {canWrite && <WbsAuthoring token={token} projectCode={projectCode} proposed />}
            <WbsCanonicalTree workPackages={proposedWps} mode="proposed" />
          </>
        ) : projectAppNative && canWrite ? (
          <WbsAuthoring token={token} projectCode={projectCode} proposed={false} />
        ) : (
          <WbsCanonicalTree workPackages={[]} />
        )}
      </Tabs.Content>

      <Tabs.Content value="schedule" className="space-y-6 pt-6">
        <ScheduleView tasks={tasks} workPackages={workPackages} />
        {tasks.length === 0 && (
          <PlanningAside rows={planningByAgent['schedule_reasoner'] ?? []} label="Schedule" token={token} canEdit={canWrite} />
        )}
      </Tabs.Content>

      <Tabs.Content value="ev" className="pt-6">
        <EarnedValueCard metrics={evMetrics} syncedAt={evSyncedAt} curve={evCurve} />
      </Tabs.Content>

      <Tabs.Content value="resources" className="pt-6">
        <ResourceLoadPanel
          load={resourceLoad}
          mode="project"
          title="Resource demand by discipline"
          subtitle="One chart per discipline — FTE demand across the project timeline · from the scheduler, read-only"
        />
      </Tabs.Content>

      <Tabs.Content value="risks" className="space-y-6 pt-6">
        <RiskHeatmap rows={data.risks} />
        <RisksTable rows={data.risks} actions={data.action_items ?? []} />
        <IssuesTable rows={data.issues} />
      </Tabs.Content>

      <Tabs.Content value="cos" className="pt-6">
        <ChangeOrdersTable rows={data.change_orders} />
      </Tabs.Content>

      <Tabs.Content value="variance" className="space-y-6 pt-6">
        <VarianceTrendChart rows={data.variance_reports} contingencyTotal={contingencyTotal} />
        <VarianceSummary rows={data.variance_reports} />
      </Tabs.Content>

      <Tabs.Content value="planning" className="pt-6">
        <PlanningPanel byAgent={planningByAgent} token={token} canEdit={canWrite} />
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
              <Kpi label="CPI · cost" value={metrics.cpi == null ? '—' : metrics.cpi.toFixed(2)} cls={ratioTone(metrics.cpi)} />
              <Kpi label="SPI · sched" value={metrics.spi == null ? '—' : metrics.spi.toFixed(2)} cls={ratioTone(metrics.spi)} />
              <Kpi label="Forecast" value={fmtM(metrics.eac)} />
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Earned value not computed yet — run the cost sync.</p>
          )}
        </button>

        {/* Needs attention */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold">Needs attention</p>
          <div className="mt-3 space-y-1.5">
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

function Kpi({ label, value, cls = 'text-foreground' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function AttnRow({ label, n, onClick }: { label: string; n: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted/60"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${n > 0 ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`}>{n}</span>
    </button>
  );
}

/* ------------------------------------------------------ AI write-up aside */

function PlanningAside({ rows, label, token, canEdit }: { rows: ArtefactRow[]; label: string; token: string; canEdit: boolean }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span aria-hidden="true">✨</span> AI {label.toLowerCase()} write-up
      </p>
      <PlanningArtefactView rows={rows} artefactLabel={label} token={token} canEdit={canEdit} />
    </div>
  );
}

/* ---------------------------------------------------------------- Planning */

function PlanningPanel({ byAgent, token, canEdit }: { byAgent: Record<string, ArtefactRow[]>; token: string; canEdit: boolean }) {
  const firstWithContent = PLANNING_TABS.find((t) => (byAgent[t.agentType]?.length ?? 0) > 0)?.value ?? PLANNING_TABS[0].value;
  const [sel, setSel] = useState(firstWithContent);
  const active = PLANNING_TABS.find((t) => t.value === sel) ?? PLANNING_TABS[0];

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav className="flex gap-1.5 overflow-x-auto pb-1 md:w-52 md:shrink-0 md:flex-col md:gap-0.5 md:overflow-visible md:border-r md:pb-0 md:pr-3">
        <p className="hidden px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:block">Planning documents</p>
        {PLANNING_TABS.map((t) => {
          const count = byAgent[t.agentType]?.length ?? 0;
          const isActive = t.value === sel;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setSel(t.value)}
              className={`flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition md:shrink ${
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : count > 0
                    ? 'text-muted-foreground hover:bg-muted/60'
                    : 'text-muted-foreground/50 hover:bg-muted/40'
              }`}
            >
              <span>{t.label}</span>
              {count > 0 && (
                <span className="rounded-full bg-background px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <PlanningArtefactView rows={byAgent[active.agentType] ?? []} artefactLabel={active.label} token={token} canEdit={canEdit} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Trigger */

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
  return (
    <Tabs.Trigger
      value={value}
      className={`relative px-3 py-2.5 text-sm font-medium transition data-[state=active]:text-foreground hover:text-foreground ${
        highlight ? 'text-foreground' : isEmpty ? 'text-muted-foreground/50' : 'text-muted-foreground'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs">{count}</span>
      )}
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground opacity-0 data-[state=active]:opacity-100 transition" />
    </Tabs.Trigger>
  );
}
