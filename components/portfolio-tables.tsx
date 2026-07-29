'use client';

/**
 * Portfolio-wide, sortable/filterable tables of every risk or issue on an
 * ACTIVE project. Rendered at the bottom of the Analytics → Risks / Issues
 * pages (the charts above remain portfolio-wide aggregations).
 *
 * Server pages pass only serializable rows + the token; column rendering and
 * filters live here (client side). Search matches across the searchable
 * fields; column headers sort; the project cell links to the project page.
 */

import { issueBadge, riskBadge, actionBadge, changeOrderBadge } from '@/lib/badge-styles';
import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { segmentStyle } from '@/lib/segment-style';
import { CANONICAL_RISK_STATUSES } from '@/lib/risk-status';
import { ROLE_TYPES, roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

type Align = 'left' | 'center' | 'right';
interface Col<R> {
  key: string;
  label: string;
  align?: Align;
  mono?: boolean;
  sortKey?: (r: R) => string | number;
  render?: (r: R) => ReactNode;
}
interface FilterDef<R> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  match: (r: R, v: string) => boolean;
}

const HML = { H: 'bg-red-100 text-red-900', M: 'bg-amber-100 text-amber-900', L: 'bg-gray-100 text-gray-700' } as const;
const hmlRank = (s: string) => (s === 'H' ? 3 : s === 'M' ? 2 : 1);

function HmlBadge({ v }: { v: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-mono ${HML[v as keyof typeof HML] ?? HML.L}`}>{v}</span>;
}


function ProjectCell({ code, name, segment }: { code: string; name: string; segment: string }) {
  const ss = segmentStyle(segment);
  return (
    <Link href={`/projects/${code}`} className="inline-flex items-center gap-1.5 hover:underline" title={name}>
      <span className={`h-2 w-2 flex-none rounded-full ${ss.dot}`} />
      <span className="font-mono text-xs font-medium">{code}</span>
    </Link>
  );
}

const SEGMENT_OPTS = [
  { value: 'renewables', label: 'Renewables' },
  { value: 'water', label: 'Water' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'power', label: 'Power' },
];

function DataTable<R>({
  rows,
  columns,
  filters,
  searchText,
  initialSortKey,
  initialSortDir = 'desc',
  emptyLabel,
}: {
  rows: R[];
  columns: Col<R>[];
  filters: FilterDef<R>[];
  searchText: (r: R) => string;
  initialSortKey: string;
  initialSortDir?: 'asc' | 'desc';
  emptyLabel: string;
}) {
  const [q, setQ] = useState('');
  const [fv, setFv] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);

  const colByKey = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns]);

  const view = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (ql && !searchText(r).toLowerCase().includes(ql)) return false;
      for (const f of filters) {
        const v = fv[f.key];
        if (v && !f.match(r, v)) return false;
      }
      return true;
    });
    const col = colByKey[sortKey];
    const sk = col?.sortKey ?? ((r: R) => String((r as Record<string, unknown>)[sortKey] ?? ''));
    out.sort((a, b) => {
      const av = sk(a);
      const bv = sk(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, q, fv, filters, sortKey, sortDir, colByKey, searchText]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const alignCls = (a?: Align) => (a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search description, ID, project, owner…"
          className="w-64 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
        />
        {filters.map((f) => (
          <select
            key={f.key}
            value={fv[f.key] ?? ''}
            onChange={(e) => setFv((p) => ({ ...p, [f.key]: e.target.value }))}
            className="rounded-md border bg-background px-2 py-1.5 text-xs"
          >
            <option value="">{f.label}: All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {view.length} of {rows.length}
        </span>
      </div>

      <div className="scroll-accent max-h-[65vh] overflow-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b bg-muted text-xs uppercase tracking-wider text-muted-foreground shadow-sm">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 ${alignCls(c.align)}`}>
                  <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 transition hover:text-foreground">
                    {c.label}
                    {sortKey === c.key && <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y [&>tr:nth-child(even)]:bg-muted/50">
            {view.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              view.map((r, i) => (
                <tr key={i} className="hover:bg-muted/70">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 align-top ${alignCls(c.align)} ${c.mono ? 'font-mono text-xs' : ''}`}>
                      {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface PortfolioIssueRow {
  issue_id: string;
  project_code: string;
  project_name: string;
  segment: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  owner: string;
  opened_week: number;
}

export function PortfolioIssuesTable({ rows }: { rows: PortfolioIssueRow[] }) {
  const columns: Col<PortfolioIssueRow>[] = [
    { key: 'project_code', label: 'Project', sortKey: (r) => r.project_code, render: (r) => <ProjectCell code={r.project_code} name={r.project_name} segment={r.segment} /> },
    { key: 'issue_id', label: 'ID', mono: true, sortKey: (r) => r.issue_id },
    { key: 'description', label: 'Description', render: (r) => <span className="block max-w-md">{r.description}</span> },
    { key: 'severity', label: 'Sev', align: 'center', sortKey: (r) => hmlRank(r.severity), render: (r) => <HmlBadge v={r.severity} /> },
    { key: 'status', label: 'Status', sortKey: (r) => r.status, render: (r) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${issueBadge(r.status)}`}>{r.status}</span> },
    { key: 'category', label: 'Category', render: (r) => <span className="text-xs text-muted-foreground">{r.category}</span> },
    { key: 'owner', label: 'Owner', render: (r) => <span className="text-xs">{r.owner || '—'}</span> },
    { key: 'opened_week', label: 'Opened', align: 'center', mono: true, sortKey: (r) => r.opened_week, render: (r) => <>Wk {r.opened_week}</> },
  ];
  const filters: FilterDef<PortfolioIssueRow>[] = [
    { key: 'segment', label: 'Segment', options: SEGMENT_OPTS, match: (r, v) => r.segment === v },
    { key: 'status', label: 'Status', options: ['Open', 'In progress', 'Resolved', 'Closed'].map((s) => ({ value: s, label: s })), match: (r, v) => r.status === v },
    { key: 'severity', label: 'Severity', options: [{ value: 'H', label: 'High' }, { value: 'M', label: 'Medium' }, { value: 'L', label: 'Low' }], match: (r, v) => r.severity === v },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchText={(r) => `${r.issue_id} ${r.description} ${r.project_code} ${r.project_name} ${r.owner} ${r.category}`}
      initialSortKey="severity"
      emptyLabel="No issues match your filters."
    />
  );
}

export interface PortfolioRiskRow {
  risk_id: string;
  project_code: string;
  project_name: string;
  segment: string;
  description: string;
  impact: string;
  probability: string;
  score: number;
  status: string;
  cross_cutting_class: string;
  owner: string;
}

export function PortfolioRisksTable({ rows }: { rows: PortfolioRiskRow[] }) {
  const columns: Col<PortfolioRiskRow>[] = [
    { key: 'project_code', label: 'Project', sortKey: (r) => r.project_code, render: (r) => <ProjectCell code={r.project_code} name={r.project_name} segment={r.segment} /> },
    { key: 'risk_id', label: 'ID', mono: true, sortKey: (r) => r.risk_id },
    { key: 'description', label: 'Description', render: (r) => <span className="block max-w-md">{r.description}</span> },
    { key: 'impact', label: 'Impact', align: 'center', sortKey: (r) => hmlRank(r.impact), render: (r) => <HmlBadge v={r.impact} /> },
    { key: 'probability', label: 'Prob', align: 'center', sortKey: (r) => hmlRank(r.probability), render: (r) => <HmlBadge v={r.probability} /> },
    { key: 'score', label: 'Score', align: 'right', mono: true, sortKey: (r) => r.score },
    { key: 'status', label: 'Status', sortKey: (r) => r.status, render: (r) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${riskBadge(r.status)}`}>{r.status}</span> },
    { key: 'cross_cutting_class', label: 'Class', render: (r) => <span className="text-xs text-muted-foreground">{r.cross_cutting_class}</span> },
    { key: 'owner', label: 'Owner', render: (r) => <span className="text-xs">{r.owner || '—'}</span> },
  ];
  const filters: FilterDef<PortfolioRiskRow>[] = [
    { key: 'segment', label: 'Segment', options: SEGMENT_OPTS, match: (r, v) => r.segment === v },
    { key: 'status', label: 'Status', options: CANONICAL_RISK_STATUSES.map((s) => ({ value: s, label: s })), match: (r, v) => r.status === v },
    { key: 'impact', label: 'Impact', options: [{ value: 'H', label: 'High' }, { value: 'M', label: 'Medium' }, { value: 'L', label: 'Low' }], match: (r, v) => r.impact === v },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchText={(r) => `${r.risk_id} ${r.description} ${r.project_code} ${r.project_name} ${r.owner} ${r.cross_cutting_class}`}
      initialSortKey="score"
      emptyLabel="No risks match your filters."
    />
  );
}



export interface PortfolioActionRow {
  id: string;
  project_code: string | null;
  project_name: string;
  segment: string;
  description: string;
  assigned_to_role: string;
  raised_by_role: string | null;
  urgency: string;
  status: string;
  created_at: string;
}

export function PortfolioActionsTable({ rows }: { rows: PortfolioActionRow[] }) {
  const columns: Col<PortfolioActionRow>[] = [
    { key: 'project_code', label: 'Project', sortKey: (r) => r.project_code ?? '~', render: (r) => (r.project_code ? <ProjectCell code={r.project_code} name={r.project_name} segment={r.segment} /> : <span className="text-xs text-muted-foreground">Portfolio</span>) },
    { key: 'description', label: 'Description', render: (r) => <span className="block max-w-md">{r.description}</span> },
    { key: 'assigned_to_role', label: 'Assigned to', sortKey: (r) => r.assigned_to_role, render: (r) => <span className="text-xs font-medium">{roleLabel(r.assigned_to_role as RoleType)}</span> },
    { key: 'raised_by_role', label: 'Raised by', sortKey: (r) => r.raised_by_role ?? '', render: (r) => <span className="text-xs text-muted-foreground">{r.raised_by_role ? roleLabel(r.raised_by_role as RoleType) : '\u2014'}</span> },
    { key: 'urgency', label: 'Urgency', align: 'center', sortKey: (r) => hmlRank(r.urgency), render: (r) => <HmlBadge v={r.urgency} /> },
    { key: 'status', label: 'Status', sortKey: (r) => r.status, render: (r) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${actionBadge(r.status)}`}>{r.status}</span> },
    { key: 'created_at', label: 'Created', align: 'center', sortKey: (r) => r.created_at, render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString()}</span> },
  ];
  const filters: FilterDef<PortfolioActionRow>[] = [
    { key: 'segment', label: 'Segment', options: SEGMENT_OPTS, match: (r, v) => r.segment === v },
    { key: 'status', label: 'Status', options: ['Open', 'Acknowledged', 'In progress', 'Done'].map((x) => ({ value: x, label: x })), match: (r, v) => r.status === v },
    { key: 'urgency', label: 'Urgency', options: [{ value: 'H', label: 'High' }, { value: 'M', label: 'Medium' }, { value: 'L', label: 'Low' }], match: (r, v) => r.urgency === v },
    { key: 'assigned', label: 'Owner', options: ROLE_TYPES.map((rt) => ({ value: rt, label: roleLabel(rt) })), match: (r, v) => r.assigned_to_role === v },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchText={(r) => `${r.description} ${r.project_code ?? ''} ${roleLabel(r.assigned_to_role as RoleType)} ${r.raised_by_role ? roleLabel(r.raised_by_role as RoleType) : ''}`}
      initialSortKey="urgency"
      emptyLabel="No actions match your filters."
    />
  );
}

export interface PortfolioEvRow {
  code: string;
  name: string;
  segment: string;
  cpi: number | null;
  spi: number | null;
  cv: number;
  vac: number | null;
  bac: number;
}

function evMoney(n: number | null): string {
  if (n == null) return '\u2014';
  const m = n / 1_000_000;
  return `${n < 0 ? '\u2212' : ''}$${Math.abs(m).toFixed(1)}M`;
}
function evTone(n: number | null): string {
  return n == null ? 'text-foreground' : n < 0.95 ? 'text-red-600' : n >= 1.0 ? 'text-emerald-700' : 'text-amber-700';
}

export function PortfolioEvTable({ rows }: { rows: PortfolioEvRow[] }) {
  const columns: Col<PortfolioEvRow>[] = [
    { key: 'code', label: 'Project', sortKey: (r) => r.code, render: (r) => <ProjectCell code={r.code} name={r.name} segment={r.segment} /> },
    { key: 'cpi', label: 'CPI', align: 'center', mono: true, sortKey: (r) => r.cpi ?? 99, render: (r) => <span className={evTone(r.cpi)}>{r.cpi == null ? '\u2014' : r.cpi.toFixed(2)}</span> },
    { key: 'spi', label: 'SPI', align: 'center', mono: true, sortKey: (r) => r.spi ?? 99, render: (r) => <span className={evTone(r.spi)}>{r.spi == null ? '\u2014' : r.spi.toFixed(2)}</span> },
    { key: 'cv', label: 'CV', align: 'right', mono: true, sortKey: (r) => r.cv, render: (r) => <span className={r.cv < 0 ? 'text-red-600' : 'text-emerald-700'}>{evMoney(r.cv)}</span> },
    { key: 'vac', label: 'VAC', align: 'right', mono: true, sortKey: (r) => r.vac ?? 0, render: (r) => <span className={r.vac != null && r.vac < 0 ? 'text-red-600' : 'text-emerald-700'}>{evMoney(r.vac)}</span> },
    { key: 'bac', label: 'BAC', align: 'right', mono: true, sortKey: (r) => r.bac, render: (r) => <span className="text-muted-foreground">{evMoney(r.bac)}</span> },
  ];
  const filters: FilterDef<PortfolioEvRow>[] = [
    { key: 'segment', label: 'Segment', options: SEGMENT_OPTS, match: (r, v) => r.segment === v },
    {
      key: 'perf', label: 'Performance',
      options: [
        { value: 'over', label: 'Over cost' },
        { value: 'behind', label: 'Behind schedule' },
        { value: 'ontrack', label: 'On track' },
      ],
      match: (r, v) => {
        const over = r.cpi != null && r.cpi < 0.97;
        const behind = r.spi != null && r.spi < 0.97;
        if (v === 'over') return over;
        if (v === 'behind') return behind;
        return !over && !behind;
      },
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchText={(r) => `${r.code} ${r.name} ${r.segment}`}
      initialSortKey="cv"
      initialSortDir="asc"
      emptyLabel="No projects match your filters."
    />
  );
}

export interface PortfolioChangeOrderRow {
  co_id: string;
  project_code: string;
  project_name: string;
  segment: string;
  driver: string;
  scope: string;
  status: string;
  cost_impact_m: number;
  revenue_impact_m: number;
  margin_pct: number | null;
  schedule_days: number;
}

const CO_DRIVER_OPTS = ['Client-directed scope', 'Site conditions', 'Design development', 'Regulatory & permits', 'Supply & escalation', 'Other'].map((d) => ({ value: d, label: d }));
function coM(v: number): string { return `${v < 0 ? '\u2212' : ''}$${Math.abs(v).toFixed(1)}M`; }

export function PortfolioChangeOrdersTable({ rows }: { rows: PortfolioChangeOrderRow[] }) {
  const columns: Col<PortfolioChangeOrderRow>[] = [
    { key: 'project_code', label: 'Project', sortKey: (r) => r.project_code, render: (r) => <ProjectCell code={r.project_code} name={r.project_name} segment={r.segment} /> },
    { key: 'co_id', label: 'CO', mono: true, sortKey: (r) => r.co_id },
    { key: 'scope', label: 'Scope', render: (r) => <span className="block max-w-md">{r.scope}</span> },
    { key: 'driver', label: 'Driver', render: (r) => <span className="text-xs text-muted-foreground">{r.driver}</span> },
    { key: 'status', label: 'Status', sortKey: (r) => r.status, render: (r) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${changeOrderBadge(r.status)}`}>{r.status}</span> },
    { key: 'cost_impact_m', label: 'Cost', align: 'right', mono: true, sortKey: (r) => r.cost_impact_m, render: (r) => coM(r.cost_impact_m) },
    { key: 'revenue_impact_m', label: 'Revenue', align: 'right', mono: true, sortKey: (r) => r.revenue_impact_m, render: (r) => <span className="text-emerald-700">{coM(r.revenue_impact_m)}</span> },
    { key: 'margin_pct', label: 'Margin', align: 'center', mono: true, sortKey: (r) => r.margin_pct ?? -999, render: (r) => <span className={r.margin_pct == null ? '' : r.margin_pct <= 0 ? 'text-red-600' : r.margin_pct < 8 ? 'text-amber-600' : 'text-emerald-700'}>{r.margin_pct == null ? '\u2014' : `${r.margin_pct.toFixed(0)}%`}</span> },
    { key: 'schedule_days', label: 'Schedule', align: 'center', mono: true, sortKey: (r) => r.schedule_days, render: (r) => <span className={r.schedule_days > 0 ? 'text-amber-600' : 'text-muted-foreground'}>{r.schedule_days > 0 ? `+${r.schedule_days}d` : '\u2014'}</span> },
  ];
  const filters: FilterDef<PortfolioChangeOrderRow>[] = [
    { key: 'segment', label: 'Segment', options: SEGMENT_OPTS, match: (r, v) => r.segment === v },
    { key: 'status', label: 'Status', options: ['Identified', 'Quantified', 'Submitted to client', 'In negotiation', 'Approved', 'Absorbed', 'Withdrawn'].map((x) => ({ value: x, label: x })), match: (r, v) => r.status === v },
    { key: 'driver', label: 'Driver', options: CO_DRIVER_OPTS, match: (r, v) => r.driver === v },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      filters={filters}
      searchText={(r) => `${r.co_id} ${r.scope} ${r.project_code} ${r.project_name} ${r.driver}`}
      initialSortKey="revenue_impact_m"
      emptyLabel="No change orders match your filters."
    />
  );
}
