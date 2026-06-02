'use client';

/**
 * Client component that renders the tabbed view on a project detail page.
 *
 * Tab layout (wraps onto two rows when narrow):
 *   Operational: Risks / Issues / Change orders / Variance
 *   Planning:    Charter / Stakeholders / WBS / Schedule / Budget / Comms
 *                Lessons / Closeout
 *
 * Agent invocation now lives in the floating widget (bottom-right of every
 * page), not as a tab. See components/floating-agent-widget.tsx.
 *
 * Planning tabs render the markdown output of the corresponding agent (from
 * agent_outputs) via <PlanningArtefactView>. Empty state if no output yet.
 * Special-cased tabs:
 *   - Risks: 3×3 heat map above the table
 *   - Variance: CPI/SPI + contingency-burn chart above the summary
 *   - Schedule: Gantt timeline strip above the markdown
 *   - WBS: collapsible hierarchical tree above the markdown
 *
 * Uses Radix Tabs with Tailwind styling.
 */

import * as Tabs from '@radix-ui/react-tabs';
import { IssuesTable } from './issues-table';
import { RisksTable } from './risks-table';
import { RiskHeatmap } from './risk-heatmap';
import { ChangeOrdersTable } from './change-orders-table';
import { VarianceSummary } from './variance-summary';
import { VarianceTrendChart } from './variance-trend-chart';
import { ScheduleGantt } from './schedule-gantt';
import { WbsTreeView } from './wbs-tree-view';
import { PlanningArtefactView, type ArtefactRow } from './planning-artefact-view';
import type { AgentType } from '@/lib/types';

/** Agents whose outputs are surfaced as planning tabs (not operational tables). */
const PLANNING_TABS: Array<{
  value: string;
  label: string;
  agentType: AgentType;
}> = [
  { value: 'charter', label: 'Charter', agentType: 'charter_drafter' },
  { value: 'stakeholders', label: 'Stakeholders', agentType: 'stakeholder_analyst' },
  { value: 'wbs', label: 'WBS', agentType: 'wbs_builder' },
  { value: 'schedule', label: 'Schedule', agentType: 'schedule_reasoner' },
  { value: 'budget', label: 'Budget', agentType: 'budget_builder' },
  { value: 'comms', label: 'Comms', agentType: 'communications_planner' },
  { value: 'lessons', label: 'Lessons', agentType: 'lessons_learned_synthesiser' },
  { value: 'closeout', label: 'Closeout', agentType: 'closeout_reporter' },
];

interface ProjectTabsProps {
  token: string;
  projectCode: string;
  allowedAgents: AgentType[];
  canWrite: boolean;
  /** Total contingency in dollars — used by variance trend chart for reference line. */
  contingencyTotal: number;
  /** Project metadata used by the Schedule Gantt strip. */
  projectCurrentWeek: number;
  projectStatus: string;
  projectHardDeadline: string | null;
  data: {
    issues: Array<Record<string, unknown>>;
    risks: Array<Record<string, unknown>>;
    change_orders: Array<Record<string, unknown>>;
    variance_reports: Array<Record<string, unknown>>;
    /** Planning agent outputs for THIS project, newest first, any agent_type. */
    planning_outputs: ArtefactRow[];
    /** Cross-agent action items raised against this project (migration 0009). */
    action_items?: Array<Record<string, unknown>>;
  };
}

export function ProjectTabs({
  token,
  projectCode,
  allowedAgents,
  canWrite,
  contingencyTotal,
  projectCurrentWeek,
  projectStatus,
  projectHardDeadline,
  data,
}: ProjectTabsProps) {
  // Group planning outputs by agent_type so each tab can show all iterations.
  const planningByAgent: Record<string, ArtefactRow[]> = {};
  for (const row of data.planning_outputs ?? []) {
    if (!planningByAgent[row.agent_type]) planningByAgent[row.agent_type] = [];
    planningByAgent[row.agent_type].push(row);
  }

  // Latest WBS markdown for the tree view (rows are sorted invoked_at DESC).
  const latestWbsMarkdown = planningByAgent['wbs_builder']?.[0]?.output_md ?? null;

  return (
    <Tabs.Root defaultValue="charter" className="mt-8">
      <Tabs.List className="flex flex-wrap gap-x-1 gap-y-2 border-b">
        {/* Planning (Charter leads) */}
        {PLANNING_TABS.map((t) => (
          <TabTrigger
            key={t.value}
            value={t.value}
            label={t.label}
            count={planningByAgent[t.agentType]?.length}
            dimWhenEmpty
          />
        ))}

        {/* Divider */}
        <span className="mx-2 self-center text-muted-foreground/40">|</span>

        {/* Operational */}
        <TabTrigger value="risks" label="Risks" count={data.risks.length} />
        <TabTrigger value="issues" label="Issues" count={data.issues.length} />
        <TabTrigger value="cos" label="Change orders" count={data.change_orders.length} />
        <TabTrigger value="variance" label="Variance" count={data.variance_reports.length} />
      </Tabs.List>

      {/* Operational panels */}
      <Tabs.Content value="risks" className="space-y-6 pt-6">
        <RiskHeatmap rows={data.risks} />
        <RisksTable rows={data.risks} actions={data.action_items ?? []} />
      </Tabs.Content>
      <Tabs.Content value="issues" className="pt-6">
        <IssuesTable rows={data.issues} />
      </Tabs.Content>
      <Tabs.Content value="cos" className="pt-6">
        <ChangeOrdersTable rows={data.change_orders} />
      </Tabs.Content>
      <Tabs.Content value="variance" className="space-y-6 pt-6">
        <VarianceTrendChart rows={data.variance_reports} contingencyTotal={contingencyTotal} />
        <VarianceSummary rows={data.variance_reports} />
      </Tabs.Content>

      {/* Planning panels */}
      {PLANNING_TABS.map((t) => (
        <Tabs.Content key={t.value} value={t.value} className="space-y-6 pt-6">
          {t.value === 'schedule' && (
            <ScheduleGantt
              currentWeek={projectCurrentWeek}
              status={projectStatus}
              hardDeadlineDescription={projectHardDeadline}
              varianceReports={data.variance_reports}
              changeOrders={data.change_orders}
            />
          )}
          {t.value === 'wbs' && (
            <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-3">
              <span className="text-base leading-none" aria-hidden="true">🗂️</span>
              <p className="text-xs text-sky-900">
                <span className="font-semibold">Scope baseline.</span> The WBS is the deliverable-based
                decomposition of <em>what</em> the project will produce — the foundation for estimating,
                risk, and the schedule. For <em>when</em> the work happens, see the{' '}
                <span className="font-medium">Schedule</span> tab.
              </p>
            </div>
          )}
          {t.value === 'wbs' && latestWbsMarkdown && (
            <WbsTreeView markdown={latestWbsMarkdown} />
          )}
          <PlanningArtefactView
            rows={planningByAgent[t.agentType] ?? []}
            artefactLabel={t.label}
            token={token}
            canEdit={canWrite}
          />
        </Tabs.Content>
      ))}

    </Tabs.Root>
  );
}

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
