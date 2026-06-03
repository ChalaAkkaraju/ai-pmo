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

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { segmentStyle } from '@/lib/segment-style';
import { CANONICAL_RISK_STATUSES } from '@/lib/risk-status';

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

function issueStatusClass(s: string): string {
  if (s === 'Closed' || s === 'Resolved') return 'bg-green-100 text-green-900';
  if (s === 'In progress') return 'bg-amber-100 text-amber-900';
  if (s === 'Open') return 'bg-red-100 text-red-900';
  return 'bg-gray-100 text-gray-700';
}
function riskStatusClass(s: string): string {
  const l = s.toLowerCase();
  if (l.startsWith('realised')) return 'bg-red-100 text-red-900';
  if (l.includes('mitigated')) return 'bg-green-100 text-green-900';
  if (l.startsWith('active')) return 'bg-amber-100 text-amber-900';
  if (l === 'open') return 'bg-sky-100 text-sky-900';
  return 'bg-gray-100 text-gray-700';
}

function ProjectCell({ token, code, name, segment }: { token: string; code: string; name: string; segment: string }) {
  const ss = segmentStyle(segment);
  return (
    <Link href={`/access/${token}/projects/${code}`} className="inline-flex items-center gap-1.5 hover:underline" title={name}>
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
  emptyLabel,
}: {
  rows: R[];
  columns: Col<R>[];
  filters: FilterDef<R>[];
  searchText: (r: R) => string;
  initialSortKey: string;
  emptyLabel: string;
}) {
  const [q, setQ] = useState('');
  const [fv, setFv] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
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
          <tbody className="divide-y">
            {view.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              view.map((r, i) => (
                <tr key={i} className="hover:bg-muted/30">
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

export function PortfolioIssuesTable({ token, rows }: { token: string; rows: PortfolioIssueRow[] }) {
  const columns: Col<PortfolioIssueRow>[] = [
    { key: 'project_code', label: 'Project', sortKey: (r) => r.project_code, render: (r) => <ProjectCell token={token} code={r.project_code} name={r.project_name} segment={r.segment} /> },
    { key: 'issue_id', label: 'ID', mono: true, sortKey: (r) => r.issue_id },
    { key: 'description', label: 'Description', render: (r) => <span className="block max-w-md">{r.description}</span> },
    { key: 'severity', label: 'Sev', align: 'center', sortKey: (r) => hmlRank(r.severity), render: (r) => <HmlBadge v={r.severity} /> },
    { key: 'status', label: 'Status', sortKey: (r) => r.status, render: (r) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${issueStatusClass(r.status)}`}>{r.status}</span> },
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

export function PortfolioRisksTable({ token, rows }: { token: string; rows: PortfolioRiskRow[] }) {
  const columns: Col<PortfolioRiskRow>[] = [
    { key: 'project_code', label: 'Project', sortKey: (r) => r.project_code, render: (r) => <ProjectCell token={token} code={r.project_code} name={r.project_name} segment={r.segment} /> },
    { key: 'risk_id', label: 'ID', mono: true, sortKey: (r) => r.risk_id },
    { key: 'description', label: 'Description', render: (r) => <span className="block max-w-md">{r.description}</span> },
    { key: 'impact', label: 'Impact', align: 'center', sortKey: (r) => hmlRank(r.impact), render: (r) => <HmlBadge v={r.impact} /> },
    { key: 'probability', label: 'Prob', align: 'center', sortKey: (r) => hmlRank(r.probability), render: (r) => <HmlBadge v={r.probability} /> },
    { key: 'score', label: 'Score', align: 'right', mono: true, sortKey: (r) => r.score },
    { key: 'status', label: 'Status', sortKey: (r) => r.status, render: (r) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${riskStatusClass(r.status)}`}>{r.status}</span> },
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
