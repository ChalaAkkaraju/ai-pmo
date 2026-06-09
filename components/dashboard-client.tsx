'use client';

/**
 * BI-rich dashboard:
 *   Hero — headline + segment donut + lifecycle bar + health pulse
 *   Insights ribbon — 3 mini charts (risk by class, issue severity, CPI distribution)
 *   KPI ribbon — 6 financial KPI cards
 *   Theme cards — clickable, each with embedded lifecycle mini-bar
 *   Segment cards — click to open a project popup (filter/sort/click-through)
 *   Recent activity feed
 */

import { CHART } from '@/lib/chart-palette';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { segmentStyle, statusBadge, statusLabel, LIFECYCLE } from '@/lib/segment-style';
import { issueBadge, riskBadge } from '@/lib/badge-styles';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { ActionRibbon } from '@/components/action-ribbon';
import type { PortfolioEv } from '@/lib/earned-value';
import type { RecentlyAddedProject } from '@/components/recently-added-banner';

export type { RecentlyAddedProject };

export interface DashboardProject {
  id: string;
  code: string;
  name: string;
  client: string;
  segment: string;
  status: string;
  current_week: number;
  contract_value_current: number;
  hard_deadline_description: string | null;
  is_new?: boolean;
}

export interface DashboardActivity {
  id: string;
  agent_type: string;
  invoked_at: string;
  project_code: string | null;
  project_name: string | null;
  project_segment: string | null;
  user_prompt: string | null;
  output_md: string | null;
  colleague_name: string | null;
  role_type: string | null;
  is_you: boolean;
}

export interface PortfolioKpis {
  total_contract_b: number;
  total_budget_b: number;
  active_count: number;
  realised_risks: number;
  open_h_issues: number;
  avg_cpi: number;
  avg_spi: number;
}

export interface SegmentSummary {
  segment: string;
  project_count: number;
  contract_value_b: number;
  active_count: number;
  sc_count: number;
  closed_count: number;
  avg_cpi: number | null;
  avg_spi: number | null;
  margin_pct: number | null;
}

export interface DrillIssue { code: string; project: string; severity: string; status: string; owner: string; description: string; [key: string]: unknown; }
export interface DrillRisk { code: string; project: string; klass: string; impact: string; status: string; owner: string; description: string; [key: string]: unknown; }
export interface DrillContingency { code: string; name: string; segment: string; pct: number; consumedM: number; budgetM: number; band: string; }
export interface ProjectRow { code: string; name: string; segment: string; cpi: number; spi: number; }
export interface PatternRow { klass: string; status: string; supporting: number; threshold: number; [key: string]: unknown; }
export interface PortfolioInsights {
  risk_exposure_m: number;
  risk_class_counts: Record<string, number>;
  issue_severity_counts: Record<string, number>;
  contingency_buckets: Record<string, number>;
  issue_rows: DrillIssue[];
  risk_rows: DrillRisk[];
  contingency_rows: DrillContingency[];
  project_rows: ProjectRow[];
  pattern_rows: PatternRow[];
}

type DrillColumn = { key: string; label: string; numeric?: boolean; render?: (v: unknown, row: Record<string, unknown>) => ReactNode };
type DrillState = { title: string; columns: DrillColumn[]; data: Array<Record<string, unknown>>; seeAllHref?: string; rowHref?: (row: Record<string, unknown>) => string };

export interface HotItem {
  id: string;
  code: string;
  name: string;
  segment: string;
  status: string;
  current_week: number;
  est_end_week: number;
  progress_pct: number;
  cpi: number;
  spi: number;
  contract_m: number;
  vac_m: number;
  contingency_pct: number | null;
  open_h_issues: number;
  realised_risks: number;
  score: number;
}

export interface FinancialKpis {
  open_commitment: number;
  recognised_revenue: number;
  recognised_margin: number;
  recognised_margin_pct: number;
  net_unbilled: number;
  billed: number;
  co_value: number;
  co_in_flight: number;
}

export interface OperationalKpis {
  open_h_issues: number;
  realised_risks: number;
  cost_off_track: number;
  sched_off_track: number;
  contingency_drawn_m: number;
  patterns_at_emergence: number;
}

export interface RoleKpiTile {
  label: string;
  value: string;
  sub: string;
  tone: 'neutral' | 'ok' | 'warn' | 'info';
}

export interface RoleKpiStrip {
  title: string;
  subtitle: string;
  tiles: RoleKpiTile[];
}

export interface WorkspaceActivity {
  count: number;
  latest_at: string | null;
  latest_by: string | null;
}

interface Props {
  token: string;
  roleType: string;
  actionsActive: number;
  issuesActive: number;
  risksActive: number;
  actionsMine: number;
  issuesMine: number;
  risksMine: number;
  roleName: string;
  roleDisplayName: string;
  roleDescription: string;
  canWrite: boolean;
  allowedAgentCount: number;
  kpis: PortfolioKpis;
  portfolioEv: PortfolioEv | null;
  roleId: string;
  workspaceActivity: WorkspaceActivity;
  operational: OperationalKpis;
  financial: FinancialKpis | null;
  roleKpis: RoleKpiStrip | null;
  insights: PortfolioInsights;
  evProjectRows: Array<{ code: string; name: string; segment: string; cpi: number | null; spi: number | null }>;
  hotItems: HotItem[];
  segmentSummaries: SegmentSummary[];
  projects: DashboardProject[];
  recentlyAdded: RecentlyAddedProject[];
  activity: DashboardActivity[];
}


function fmtMoneyM(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

function fmtBillions(b: number): string {
  return `$${b.toFixed(2)}B`;
}

function fmtFin(n: number): string {
  return Math.abs(n) >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(2)}B` : `$${(n / 1_000_000).toFixed(1)}M`;
}

function agentAccent(agentType: string): { bar: string; chip: string } {
  // Group agents into colour families so the feed is scannable by agent type.
  const t = agentType;
  if (t.includes('risk')) return { bar: 'bg-rose-400', chip: 'bg-rose-100 text-rose-800' };
  if (t.includes('variance') || t.includes('budget') || t.includes('change_order'))
    return { bar: 'bg-amber-400', chip: 'bg-amber-100 text-amber-800' };
  if (t.includes('schedule') || t.includes('wbs') || t.includes('charter'))
    return { bar: 'bg-sky-400', chip: 'bg-sky-100 text-sky-800' };
  if (t.includes('issue')) return { bar: 'bg-orange-400', chip: 'bg-orange-100 text-orange-800' };
  if (t.includes('stakeholder') || t.includes('communications'))
    return { bar: 'bg-violet-400', chip: 'bg-violet-100 text-violet-800' };
  if (t.includes('lessons') || t.includes('closeout'))
    return { bar: 'bg-emerald-400', chip: 'bg-emerald-100 text-emerald-800' };
  return { bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-700' };
}

function prettyAgent(t: string): string {
  return t.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

function colleagueInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.replace(/\./g, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleChipClass(role_type: string | null): string {
  switch (role_type) {
    case 'pm': return 'bg-emerald-100 text-emerald-800';
    case 'procurement': return 'bg-amber-100 text-amber-800';
    case 'risk': return 'bg-rose-100 text-rose-800';
    case 'sponsor': return 'bg-violet-100 text-violet-800';
    case 'commercial': return 'bg-sky-100 text-sky-800';
    case 'project_controls': return 'bg-indigo-100 text-indigo-800';
    case 'program_manager': return 'bg-teal-100 text-teal-800';
    case 'engineering_manager': return 'bg-cyan-100 text-cyan-800';
    case 'construction_manager': return 'bg-orange-100 text-orange-800';
    case 'hse_manager': return 'bg-fuchsia-100 text-fuchsia-800';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function shortRole(role_type: string | null): string {
  switch (role_type) {
    case 'pm': return 'PM';
    case 'procurement': return 'Procurement';
    case 'risk': return 'Risk';
    case 'sponsor': return 'Sponsor';
    case 'commercial': return 'Commercial';
    case 'project_controls': return 'Project Controls';
    case 'program_manager': return 'Program Mgr';
    case 'engineering_manager': return 'Engineering Mgr';
    case 'construction_manager': return 'Construction Mgr';
    case 'hse_manager': return 'HSE';
    default: return role_type ?? '';
  }
}

/** Walk React children and extract the leading plain-text content for callout detection. */
function extractLeadingText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(extractLeadingText).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    const c = children as { props?: { children?: React.ReactNode } };
    return extractLeadingText(c.props?.children);
  }
  return '';
}

/** Strip light markdown for a plain-text preview line. */
function stripMd(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

// =============================================================================
// SVG donut for segment mix
// =============================================================================

function SegmentDonut({ segments }: { segments: SegmentSummary[] }) {
  const total = segments.reduce((s, x) => s + x.project_count, 0);
  if (total === 0) return null;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 65;
  const innerR = 42;

  let cumulativeAngle = -Math.PI / 2;
  const slices = segments.map((s) => {
    const fraction = s.project_count / total;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + fraction * 2 * Math.PI;
    cumulativeAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + innerR * Math.cos(endAngle);
    const yi1 = cy + innerR * Math.sin(endAngle);
    const xi2 = cx + innerR * Math.cos(startAngle);
    const yi2 = cy + innerR * Math.sin(startAngle);

    const largeArc = fraction > 0.5 ? 1 : 0;
    const path = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)}`,
      'Z',
    ].join(' ');

    return { segment: s.segment, path, fill: segmentStyle(s.segment).hex, count: s.project_count };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((sl) => (
        <path key={sl.segment} d={sl.path} fill={sl.fill} stroke="white" strokeWidth={2} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: 26, fontWeight: 700 }}>
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
        projects
      </text>
    </svg>
  );
}

// =============================================================================
// Status (lifecycle) horizontal bar — used in hero AND inside theme cards
// =============================================================================

function LifecycleBar({
  active,
  sc,
  closed,
  showLegend = true,
  inlineCounts = false,
  onStatusClick,
}: { active: number; sc: number; closed: number; showLegend?: boolean; inlineCounts?: boolean; onStatusClick?: (status: 'Active' | 'SC' | 'Closed') => void }) {
  const total = active + sc + closed;
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      <div className={`flex w-full overflow-hidden bg-muted ${inlineCounts ? 'h-6 rounded-md' : 'h-2.5 rounded-full'}`}>
        {([
          ['Active', active, LIFECYCLE.Active.bar, 'text-white'],
          ['SC', sc, LIFECYCLE.SC.bar, 'text-white'],
          ['Closed', closed, LIFECYCLE.Closed.bar, 'text-gray-900'],
        ] as const).map(([key, val, barCls, textCls]) => {
          if (val === 0) return null;
          const pct = (val / total) * 100;
          return (
            <div
              key={key}
              onClick={onStatusClick ? () => onStatusClick(key) : undefined}
              className={`flex items-center justify-center ${barCls} ${onStatusClick ? 'cursor-pointer' : ''} ${inlineCounts ? `text-[11px] font-semibold tabular-nums ${textCls}` : ''}`}
              style={{ width: `${pct}%` }}
              title={`${key}: ${val}`}
            >
              {inlineCounts && pct >= 8 ? val : ''}
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span onClick={onStatusClick ? () => onStatusClick('Active') : undefined} className={`inline-flex items-center gap-1.5 ${onStatusClick ? 'cursor-pointer' : ''}`}><span className={`h-2 w-2 rounded-full ${LIFECYCLE.Active.dot}`} />Active <strong className="tabular-nums">{active}</strong></span>
          <span onClick={onStatusClick ? () => onStatusClick('SC') : undefined} className={`inline-flex items-center gap-1.5 ${onStatusClick ? 'cursor-pointer' : ''}`}><span className={`h-2 w-2 rounded-full ${LIFECYCLE.SC.dot}`} />Subst. complete <strong className="tabular-nums">{sc}</strong></span>
          <span onClick={onStatusClick ? () => onStatusClick('Closed') : undefined} className={`inline-flex items-center gap-1.5 ${onStatusClick ? 'cursor-pointer' : ''}`}><span className={`h-2 w-2 rounded-full ${LIFECYCLE.Closed.dot}`} />Closed <strong className="tabular-nums">{closed}</strong></span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Mini horizontal bar chart for insights
// =============================================================================

interface BarItem { label: string; value: number; color: string; }

function MiniBarChart({ items, maxLabelWidth = 'flex-1', wrapLabels = false, fill = false, onItemClick }: { items: BarItem[]; maxLabelWidth?: string; wrapLabels?: boolean; fill?: boolean; onItemClick?: (label: string) => void }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className={fill ? 'flex h-full flex-1 flex-col justify-between gap-2' : 'space-y-2'}>
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} onClick={onItemClick ? () => onItemClick(item.label) : undefined} className={`flex items-center gap-3 text-xs ${onItemClick ? 'cursor-pointer rounded hover:bg-muted/40' : ''}`}>
            <div className={`${maxLabelWidth} ${wrapLabels ? 'whitespace-normal leading-tight' : 'truncate'} text-muted-foreground`} title={item.label}>{item.label}</div>
            <div className="relative h-5 flex-[2] overflow-hidden rounded bg-muted">
              <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
              <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-semibold tabular-nums text-foreground">{item.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Stacked proportion ribbon — one bar split by share of total, with a legend below.
 *  Items should be ordered good -> bad (left -> right) for a consistent health read. */
function StackedRibbon({ items, onSegmentClick }: { items: BarItem[]; onSegmentClick?: (label: string) => void }) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  return (
    <div>
      <div className="flex h-8 overflow-hidden rounded-md">
        {items.map((item) => {
          const pct = (item.value / total) * 100;
          if (item.value === 0) return null;
          return (
            <div
              key={item.label}
              onClick={onSegmentClick ? () => onSegmentClick(item.label) : undefined}
              className={`flex items-center justify-center text-[11px] font-semibold tabular-nums ${onSegmentClick ? 'cursor-pointer' : ''}`}
              style={{ width: `${pct}%`, backgroundColor: item.color, color: 'rgba(0,0,0,0.7)' }}
              title={onSegmentClick ? `View ${item.label} (${item.value})` : `${item.label}: ${item.value}`}
            >
              {pct >= 14 ? item.value : ''}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {items.map((item) => (
          <span key={item.label} onClick={onSegmentClick ? () => onSegmentClick(item.label) : undefined} className={`inline-flex items-center gap-1.5 text-[11px] text-muted-foreground ${onSegmentClick ? 'cursor-pointer hover:text-foreground' : ''}`}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label} <span className="font-medium tabular-nums text-foreground">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DrillModal({ title, columns, data, seeAllHref, rowHref, onClose }: DrillState & { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q ? data.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))) : data.slice();
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      out = [...out].sort((a, b) => {
        const av = a[sortKey] as string | number, bv = b[sortKey] as string | number;
        const cmp = col?.numeric ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [data, columns, query, sortKey, sortDir]);
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="mt-6 w-full max-w-3xl rounded-xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-3">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{rows.length} of {data.length} shown{rowHref ? ' · click a row to open' : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-0.5 text-sm text-muted-foreground hover:bg-muted" aria-label="Close">&times;</button>
        </div>
        <div className="border-b px-5 py-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter records…" className="w-full rounded-md border bg-background px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-foreground/20" />
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matching records.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  {columns.map((c) => (
                    <th key={c.key} className="py-1.5 pr-3 font-medium">
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {c.label}{sortKey === c.key && <span aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={i} onClick={rowHref ? () => { onClose(); router.push(rowHref(r)); } : undefined} className={`align-top ${rowHref ? 'cursor-pointer hover:bg-muted/40' : ''}`}>
                    {columns.map((c) => <td key={c.key} className="py-1.5 pr-3">{c.render ? c.render(r[c.key], r) : String(r[c.key] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {seeAllHref && (
          <div className="border-t px-5 py-2.5 text-right">
            <Link href={seeAllHref} className="text-xs font-medium text-foreground hover:underline">See all in analytics →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main
// =============================================================================

function PortfolioEvBand({ ev, onBehindClick, onOverClick }: { ev: PortfolioEv; onBehindClick?: () => void; onOverClick?: () => void }) {
  const money = (n: number | null) => {
    if (n == null) return '\u2014';
    const m = n / 1_000_000;
    return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
  };
  const ratioTone = (v: number | null) =>
    v == null ? 'text-slate-900' : v < 0.97 ? 'text-red-600' : v >= 1.0 ? 'text-emerald-700' : 'text-amber-700';
  const Cell = ({ label, value, cls = 'text-slate-900', accent }: { label: string; value: string; cls?: string; accent?: string }) => (
    <div className="rounded-md bg-white/70 px-3 py-2" style={accent ? { backgroundColor: `${accent}14` } : undefined}>
      <p className="text-[10px] font-medium uppercase tracking-wider" style={accent ? { color: accent } : undefined}>{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
    </div>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 via-white to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none" aria-hidden="true">📈</span>
          <div>
            <h2 className="text-base font-semibold">Portfolio earned value</h2>
            <p className="text-xs text-muted-foreground">
              {ev.complete_pct.toFixed(0)}% complete · computed across {ev.projects_in} project{ev.projects_in === 1 ? '' : 's'} · cost from SAP PS, progress from the scheduler
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ev.behind_count > 0 && <button type="button" onClick={onBehindClick} className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-100">{ev.behind_count} behind schedule</button>}
          {ev.over_count > 0 && <button type="button" onClick={onOverClick} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-100">{ev.over_count} over cost</button>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Cell label="Budget (BAC)" value={money(ev.bac)} />
        <Cell label="Planned (PV)" value={money(ev.pv)} accent={CHART.planned} />
        <Cell label="Earned (EV)" value={money(ev.ev)} accent={CHART.earned} />
        <Cell label="Actual (AC)" value={money(ev.ac)} accent={CHART.actual} />
        <Cell label="CPI · cost" value={ev.cpi == null ? '\u2014' : ev.cpi.toFixed(2)} cls={ratioTone(ev.cpi)} />
        <Cell label="SPI · sched" value={ev.spi == null ? '\u2014' : ev.spi.toFixed(2)} cls={ratioTone(ev.spi)} />
        <Cell label="Forecast (EAC)" value={money(ev.eac)} />
        <Cell label="Variance (VAC)" value={money(ev.vac)} cls={ev.vac != null && ev.vac < 0 ? 'text-red-600' : 'text-emerald-700'} />
      </div>
    </section>
  );
}

export function DashboardClient({
  token,
  roleType,
  actionsActive,
  issuesActive,
  risksActive,
  actionsMine,
  issuesMine,
  risksMine,
  roleName,
  roleDisplayName,
  roleDescription,
  canWrite,
  allowedAgentCount,
  kpis,
  portfolioEv,
  roleId,
  workspaceActivity,
  operational,
  financial,
  roleKpis,
  insights,
  evProjectRows,
  hotItems,
  segmentSummaries,
  projects,
  recentlyAdded,
  activity: initialActivity,
}: Props) {
  const router = useRouter();
  const [drill, setDrill] = useState<DrillState | null>(null);
  const statusCol = (badge: (s: string) => string): DrillColumn => ({ key: 'status', label: 'Status', render: (v) => <span className={`inline-block rounded-full px-2 py-0.5 ${badge(String(v))}`}>{String(v)}</span> });
  const sevByLabel: Record<string, 'H' | 'M' | 'L'> = { High: 'H', Medium: 'M', Low: 'L' };
  function openIssuesDrill(label: string) {
    const sev = sevByLabel[label];
    const data = insights.issue_rows.filter((r) => r.severity === sev);
    setDrill({
      title: `${data.length} ${label.toLowerCase()}-severity issue${data.length === 1 ? '' : 's'}`,
      columns: [{ key: 'code', label: 'Project' }, { key: 'description', label: 'Issue' }, { key: 'owner', label: 'Owner' }, statusCol(issueBadge)],
      data,
      seeAllHref: `/access/${token}/analytics/issues`,
      rowHref: (r) => `/access/${token}/projects/${r.code}?tab=risks`,
    });
  }
  function openRisksDrill(klass: string) {
    const data = insights.risk_rows.filter((r) => r.klass === klass);
    setDrill({
      title: `${data.length} risk${data.length === 1 ? '' : 's'} · ${klass}`,
      columns: [{ key: 'code', label: 'Project' }, { key: 'description', label: 'Risk' }, { key: 'owner', label: 'Owner' }, { key: 'impact', label: 'Impact' }, statusCol(riskBadge)],
      data,
      seeAllHref: `/access/${token}/analytics/risks`,
      rowHref: (r) => `/access/${token}/projects/${r.code}?tab=risks`,
    });
  }
  function openContingencyDrill(band: string) {
    const data = insights.contingency_rows.filter((r) => r.band === band).map((r) => ({ ...r, project: `${r.name} (${r.code})`, consumed: `$${r.consumedM.toFixed(2)}M / $${r.budgetM.toFixed(1)}M` }));
    setDrill({
      title: `${data.length} project${data.length === 1 ? '' : 's'} · ${band} contingency used`,
      columns: [{ key: 'project', label: 'Project' }, { key: 'segment', label: 'Segment' }, { key: 'pct', label: 'Used %', numeric: true, render: (v) => `${v}%` }, { key: 'consumed', label: 'Consumed / budget' }],
      data,
      rowHref: (r) => `/access/${token}/projects/${r.code}?tab=variance`,
    });
  }
  function openOpenHIssues() {
    const data = insights.issue_rows.filter((r) => r.severity === 'H' && (r.status === 'Open' || r.status === 'In progress'));
    setDrill({ title: `${data.length} open high-severity issue${data.length === 1 ? '' : 's'}`, columns: [{ key: 'code', label: 'Project' }, { key: 'description', label: 'Issue' }, { key: 'owner', label: 'Owner' }, statusCol(issueBadge)], data, seeAllHref: `/access/${token}/analytics/issues`, rowHref: (r) => `/access/${token}/projects/${r.code}?tab=risks` });
  }
  function openRealisedRisks() {
    const data = insights.risk_rows.filter((r) => r.status.toLowerCase().startsWith('realis'));
    setDrill({ title: `${data.length} realised risk${data.length === 1 ? '' : 's'}`, columns: [{ key: 'code', label: 'Project' }, { key: 'description', label: 'Risk' }, { key: 'klass', label: 'Class' }, { key: 'owner', label: 'Owner' }, statusCol(riskBadge)], data, seeAllHref: `/access/${token}/analytics/risks`, rowHref: (r) => `/access/${token}/projects/${r.code}?tab=risks` });
  }
  function openCostOffTrack() {
    const data = insights.project_rows.filter((r) => r.cpi < 0.95).map((r) => ({ ...r, project: `${r.name} (${r.code})` })).sort((a, b) => a.cpi - b.cpi);
    setDrill({ title: `${data.length} project${data.length === 1 ? '' : 's'} cost off-track · CPI < 0.95`, columns: [{ key: 'project', label: 'Project' }, { key: 'segment', label: 'Segment' }, { key: 'cpi', label: 'CPI', numeric: true, render: (v) => Number(v).toFixed(2) }, { key: 'spi', label: 'SPI', numeric: true, render: (v) => Number(v).toFixed(2) }], data, rowHref: (r) => `/access/${token}/projects/${r.code}?tab=ev` });
  }
  function openSchedOffTrack() {
    const data = insights.project_rows.filter((r) => r.spi < 0.95).map((r) => ({ ...r, project: `${r.name} (${r.code})` })).sort((a, b) => a.spi - b.spi);
    setDrill({ title: `${data.length} project${data.length === 1 ? '' : 's'} schedule off-track · SPI < 0.95`, columns: [{ key: 'project', label: 'Project' }, { key: 'segment', label: 'Segment' }, { key: 'spi', label: 'SPI', numeric: true, render: (v) => Number(v).toFixed(2) }, { key: 'cpi', label: 'CPI', numeric: true, render: (v) => Number(v).toFixed(2) }], data, rowHref: (r) => `/access/${token}/projects/${r.code}?tab=ev` });
  }
  function openContingencyDrawn() {
    const data = insights.contingency_rows.filter((r) => r.consumedM > 0).map((r) => ({ ...r, project: `${r.name} (${r.code})`, consumed: `$${r.consumedM.toFixed(2)}M / $${r.budgetM.toFixed(1)}M` })).sort((a, b) => b.consumedM - a.consumedM);
    setDrill({ title: `${data.length} project${data.length === 1 ? '' : 's'} with contingency drawn`, columns: [{ key: 'project', label: 'Project' }, { key: 'segment', label: 'Segment' }, { key: 'pct', label: 'Used %', numeric: true, render: (v) => `${v}%` }, { key: 'consumed', label: 'Consumed / budget' }], data, rowHref: (r) => `/access/${token}/projects/${r.code}?tab=variance` });
  }
  function openPatterns() {
    const data = insights.pattern_rows.filter((r) => r.supporting >= r.threshold).sort((a, b) => b.supporting - a.supporting);
    setDrill({ title: `${data.length} pattern${data.length === 1 ? '' : 's'} at emergence`, columns: [{ key: 'klass', label: 'Class' }, { key: 'status', label: 'Status' }, { key: 'supporting', label: 'Projects', numeric: true }, { key: 'threshold', label: 'Threshold', numeric: true }], data });
  }
  function openStatusDrill(status: 'Active' | 'SC' | 'Closed') {
    const data = projects.filter((p) => p.status === status).map((p) => ({ ...p, project: `${p.name} (${p.code})` }));
    const labelMap: Record<string, string> = { Active: 'active', SC: 'in substantial completion', Closed: 'closed' };
    setDrill({ title: `${data.length} ${labelMap[status]} project${data.length === 1 ? '' : 's'}`, columns: [{ key: 'project', label: 'Project' }, { key: 'segment', label: 'Segment' }, { key: 'client', label: 'Client' }, { key: 'current_week', label: 'Week', numeric: true }], data, rowHref: (r) => `/access/${token}/projects/${r.code}` });
  }
  function openSegmentDrill(segment: string) {
    const data = projects.filter((p) => p.segment === segment).map((p) => ({ ...p, project: `${p.name} (${p.code})` }));
    setDrill({
      title: `${segmentStyle(segment).label} — ${data.length} project${data.length === 1 ? '' : 's'}`,
      columns: [
        { key: 'project', label: 'Project' },
        { key: 'client', label: 'Client' },
        { key: 'status', label: 'Status', render: (v) => <span className={`inline-block rounded-full px-2 py-0.5 ${statusBadge(String(v))}`}>{statusLabel(String(v))}</span> },
        { key: 'current_week', label: 'Week', numeric: true },
        { key: 'contract_value_current', label: 'Contract', numeric: true, render: (v) => fmtMoneyM(Number(v)) },
      ],
      data,
      rowHref: (r) => `/access/${token}/projects/${r.code}`,
    });
  }
  function openBehindDrill() {
    const data = evProjectRows.filter((r) => r.spi != null && r.spi < 0.97).map((r) => ({ ...r, project: `${r.name} (${r.code})` })).sort((a, b) => (a.spi ?? 9) - (b.spi ?? 9));
    setDrill({ title: `${data.length} project${data.length === 1 ? '' : 's'} behind schedule · SPI < 0.97`, columns: [{ key: 'project', label: 'Project' }, { key: 'segment', label: 'Segment' }, { key: 'spi', label: 'SPI', numeric: true, render: (v) => Number(v).toFixed(2) }, { key: 'cpi', label: 'CPI', numeric: true, render: (v) => Number(v).toFixed(2) }], data, rowHref: (r) => `/access/${token}/projects/${r.code}?tab=ev` });
  }
  function openOverDrill() {
    const data = evProjectRows.filter((r) => r.cpi != null && r.cpi < 0.97).map((r) => ({ ...r, project: `${r.name} (${r.code})` })).sort((a, b) => (a.cpi ?? 9) - (b.cpi ?? 9));
    setDrill({ title: `${data.length} project${data.length === 1 ? '' : 's'} over cost · CPI < 0.97`, columns: [{ key: 'project', label: 'Project' }, { key: 'segment', label: 'Segment' }, { key: 'cpi', label: 'CPI', numeric: true, render: (v) => Number(v).toFixed(2) }, { key: 'spi', label: 'SPI', numeric: true, render: (v) => Number(v).toFixed(2) }], data, rowHref: (r) => `/access/${token}/projects/${r.code}?tab=ev` });
  }

  // Always-visible global project search (separate from the segment
  // drill-down search above). Matches on code, name, client, or segment.
  const [globalQuery, setGlobalQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const globalSearchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return [];
    return projects
      .filter((p) => {
        return (
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q) ||
          p.segment.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [globalQuery, projects]);

  // Live agent-activity feed — seeded by server-rendered prop, updated by
  // Supabase Realtime subscription on the agent_outputs table.
  const [activity, setActivity] = useState<DashboardActivity[]>(initialActivity);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // The whole "Your recent activity" section is collapsed by default so it
  // doesn't dominate the dashboard; the user expands it on demand.
  const [activityOpen, setActivityOpen] = useState(false);

  // The expanded card used to support an inline "Show full report" toggle
  // that re-fired the agent in full mode. That UI was retired — the single
  // "↗ Show full report" link at the top of the expanded card now opens the
  // polished printable report in a new tab instead. Simpler, no duplicate
  // activity-feed entries, no per-click LLM cost.

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel('agent_outputs_inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_outputs' },
        async (payload) => {
          const row = payload.new as {
            id: string;
            agent_type: string;
            invoked_at: string;
            project_id: string | null;
            user_prompt: string | null;
            output_md: string | null;
            invoked_by_role_id: string | null;
          };
          // Lead feed is scoped to this role; ignore other roles' inserts here.
          if (row.invoked_by_role_id !== roleId) return;
          // Fetch joined project + colleague info so the card is meaningful.
          let project_code: string | null = null;
          let project_name: string | null = null;
          let project_segment: string | null = null;
          if (row.project_id) {
            const { data } = await supabase
              .from('projects')
              .select('code, name, segment')
              .eq('id', row.project_id)
              .maybeSingle();
            project_code = data?.code ?? null;
            project_name = data?.name ?? null;
            project_segment = data?.segment ?? null;
          }
          let colleague_name: string | null = null;
          let role_type: string | null = null;
          if (row.invoked_by_role_id) {
            const { data } = await supabase
              .from('roles')
              .select('name, role_type')
              .eq('id', row.invoked_by_role_id)
              .maybeSingle();
            colleague_name = data?.name ?? null;
            role_type = data?.role_type ?? null;
          }
          const newActivity: DashboardActivity = {
            id: row.id,
            agent_type: row.agent_type,
            invoked_at: row.invoked_at,
            project_code,
            project_name,
            project_segment,
            user_prompt: row.user_prompt,
            output_md: row.output_md,
            colleague_name,
            role_type,
            is_you: true,
          };
          setActivity((prev) => {
            // De-dup: if this id already exists (race with initial server fetch), skip.
            if (prev.some((a) => a.id === row.id)) return prev;
            return [newActivity, ...prev].slice(0, 5);
          });
          // Briefly highlight new arrivals — clear after 4 seconds.
          setNewIds((prev) => {
            const next = new Set(prev);
            next.add(row.id);
            return next;
          });
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(row.id);
              return next;
            });
          }, 4000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roleId]);

  const totalProjects = segmentSummaries.reduce((s, x) => s + x.project_count, 0);
  const totalActive = segmentSummaries.reduce((s, x) => s + x.active_count, 0);
  const totalSc = segmentSummaries.reduce((s, x) => s + x.sc_count, 0);
  const totalClosed = segmentSummaries.reduce((s, x) => s + x.closed_count, 0);
  // Health pulse uses the canonical earned value (same basis as the EV band)
  // so the two headline CPI/SPI figures always agree; falls back to the
  // reported average only when canonical EV isn't computable.
  const pulseCpi = portfolioEv?.ready && portfolioEv.cpi != null ? portfolioEv.cpi : kpis.avg_cpi;
  const pulseSpi = portfolioEv?.ready && portfolioEv.spi != null ? portfolioEv.spi : kpis.avg_spi;


  // Insights chart data
  const RISK_CLASS_COLORS: Record<string, string> = {
    'Vendor / supplier concentration': '#f97316',
    'Regulatory / external deadline': '#eab308',
    'Site-conditions variance': '#84cc16',
    'Resource / labour scarcity': '#06b6d4',
    'Client-driven scope or sequence changes': '#8b5cf6',
    'Weather / climate-sensitive construction': '#ec4899',
    'Project-specific': '#64748b',
  };
  const riskBars: BarItem[] = Object.entries(insights.risk_class_counts)
    .sort((a, b) => b[1] - a[1])
    .map(([cls, count]) => ({
      label: cls,
      value: count,
      color: RISK_CLASS_COLORS[cls] ?? '#64748b',
    }));

  const issueBars: BarItem[] = [
    { label: 'Low',    value: insights.issue_severity_counts.L ?? 0, color: '#10b981' },
    { label: 'Medium', value: insights.issue_severity_counts.M ?? 0, color: '#f59e0b' },
    { label: 'High',   value: insights.issue_severity_counts.H ?? 0, color: '#ef4444' },
  ];

  const contingencyBars: BarItem[] = Object.entries(insights.contingency_buckets).map(([label, count]) => ({
    label,
    value: count,
    color:
      label === '0-25%'   ? '#10b981' :
      label === '25-50%'  ? '#84cc16' :
      label === '50-75%'  ? '#eab308' :
      label === '75-100%' ? '#f97316' : '#ef4444',
  }));

  return (
    <div className="container mx-auto max-w-screen-2xl px-8 py-8 space-y-6">
      {/* Global project search — always visible, matches across all 99 projects.
          The segment drill-down has its own scoped search lower in the page; this
          one is for jumping straight to any project by name, code, client, or segment. */}
      <section>
        <div className="relative">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
              🔎
            </span>
            <input
              type="text"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // Delay so a click on a result has time to register before the dropdown unmounts.
                setTimeout(() => setIsSearchFocused(false), 150);
              }}
              placeholder="Search projects — try a code (NW-REN-2511), a name, a client, or a segment (renewables, water…)"
              className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              aria-label="Search projects"
            />
            {globalQuery && (
              <button
                type="button"
                onClick={() => setGlobalQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {globalQuery.trim() && isSearchFocused && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[28rem] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {globalSearchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No projects match &ldquo;{globalQuery.trim()}&rdquo;.
                </div>
              ) : (
                <>
                  <p className="border-b border-slate-100 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {globalSearchResults.length} match{globalSearchResults.length === 1 ? '' : 'es'} {globalSearchResults.length === 8 ? '(showing first 8)' : ''}
                  </p>
                  <ul className="divide-y divide-slate-100">
                    {globalSearchResults.map((p) => {
                      const ss = segmentStyle(p.segment);
                      return (
                        <li key={p.id}>
                          <Link
                            href={`/access/${token}/projects/${p.code}`}
                            className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50"
                          >
                            <span className={`h-8 w-1 flex-none rounded-full ${ss.accentBar}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="truncate text-sm font-semibold text-foreground">{p.name}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">{p.code}</span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="capitalize">{p.segment}</span>
                                <span>·</span>
                                <span className="truncate">{p.client}</span>
                                <span>·</span>
                                <span>Week {p.current_week}</span>
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(p.status)}`}>
                              {p.status}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* HERO */}
      <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6 shadow-md">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:divide-x md:divide-slate-200">
          <div className="flex flex-col justify-center md:pr-6">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total portfolio value</p>
            <p className="mt-1 text-6xl font-bold tracking-tight tabular-nums">{fmtBillions(kpis.total_contract_b)}</p>
            <p className="mt-2 text-base text-muted-foreground">{totalProjects} projects across {segmentSummaries.length} segments</p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-sm text-muted-foreground">Approved budget</p>
                <p className="mt-0.5 font-semibold tabular-nums">{fmtBillions(kpis.total_budget_b)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Implied margin</p>
                <p className="mt-0.5 font-semibold tabular-nums">{((kpis.total_contract_b - kpis.total_budget_b) / kpis.total_contract_b * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center md:px-2">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Segment mix</p>
            {/* Horizontal segment bars — fills the column width + height and shows
                project count (bar length) and margin together, colored per segment. */}
            <div className="flex w-full flex-1 flex-col justify-center gap-5 py-1">
              {segmentSummaries.map((s) => {
                const ss = segmentStyle(s.segment);
                const maxCount = Math.max(...segmentSummaries.map((x) => x.project_count), 1);
                const pct = Math.round((s.project_count / maxCount) * 100);
                return (
                  <div key={s.segment} onClick={() => openSegmentDrill(s.segment)} className="cursor-pointer rounded-md p-1.5 -m-1.5 transition hover:bg-muted/40">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: ss.hex }}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ss.hex }} />
                        {ss.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        <strong className="tabular-nums text-foreground">{s.project_count}</strong> projects
                        {s.margin_pct !== null && (
                          <>
                            {' · '}
                            <strong className="tabular-nums" style={{ color: ss.hex }}>{s.margin_pct.toFixed(1)}%</strong> margin
                          </>
                        )}
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ss.hex }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-center md:pl-6">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Lifecycle mix</p>
            <LifecycleBar active={totalActive} sc={totalSc} closed={totalClosed} onStatusClick={openStatusDrill} />
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Portfolio health pulse</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{pulseCpi.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">CPI</span>
                <span className="mx-1 text-muted-foreground/50">·</span>
                <span className="text-3xl font-semibold tabular-nums">{pulseSpi.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">SPI</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {(() => {
                  const healthy = pulseCpi >= 1 && pulseSpi >= 1;
                  const warning = pulseCpi < 0.95 || pulseSpi < 0.95;
                  const dotCls = warning ? 'bg-amber-500' : healthy ? 'bg-emerald-500' : 'bg-blue-500';
                  const label = warning ? 'Below tolerance — needs attention' : healthy ? 'On or ahead of plan' : 'Within tolerance';
                  return (<><span className={`h-2 w-2 rounded-full ${dotCls}`} /><p className="text-xs text-muted-foreground">{label}{portfolioEv?.ready ? ' · earned-value basis' : ''}</p></>);
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action ribbon — slim attention bar + popup; sits just below the portfolio HERO */}
      <ActionRibbon
        token={token}
        roleType={roleType}
        actionsActive={actionsActive}
        issuesActive={issuesActive}
        risksActive={risksActive}
        actionsMine={actionsMine}
        issuesMine={issuesMine}
        risksMine={risksMine}
        recentlyAdded={recentlyAdded}
      />

      {/* Portfolio earned value — the one number that needs cost, schedule and
          structure together. Computed from the canonical model (sum of
          BAC/PV/EV/AC across projects, indices recomputed from the totals). */}
      {portfolioEv && portfolioEv.ready && (
        <PortfolioEvBand ev={portfolioEv} onBehindClick={openBehindDrill} onOverClick={openOverDrill} />
      )}

      {/* Ribbon 1b — portfolio financial position (cost-to-cash rollup: commitment,
          recognised revenue from RA, billing — net-new vs the EV pulse). */}
      {financial && (
        <section>
          <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio financial position</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Cost-to-cash across active projects · commitment, recognised revenue (Results Analysis) and billing — independent of the managerial EV pulse above.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Open commitment" value={fmtFin(financial.open_commitment)} sub="open POs · forward cost" tone="neutral" />
            <KpiCard label="Recognised revenue" value={fmtFin(financial.recognised_revenue)} sub="Results Analysis · POC" tone="info" />
            <KpiCard label="Recognised margin" value={`${financial.recognised_margin_pct.toFixed(1)}%`} sub={`${fmtFin(financial.recognised_margin)} to date`} tone={financial.recognised_margin_pct < 8 ? 'warn' : 'ok'} />
            <KpiCard label={financial.net_unbilled >= 0 ? 'Net unbilled (WIP)' : 'Deferred / over-billed'} value={fmtFin(Math.abs(financial.net_unbilled))} sub={financial.net_unbilled >= 0 ? 'earned, not yet billed' : 'billed ahead of revenue'} tone={financial.net_unbilled >= 0 ? 'neutral' : 'warn'} />
            <KpiCard label="Billed to date" value={fmtFin(financial.billed)} sub="invoices raised" tone="neutral" />
            <KpiCard label="Change orders" value={fmtFin(financial.co_value)} sub={`${financial.co_in_flight} in flight · revenue impact`} tone={financial.co_in_flight > 0 ? 'info' : 'neutral'} />
          </div>
        </section>
      )}

      {/* Ribbon 2 — Segment cards (click to drill in) */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Segments</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {segmentSummaries.map((s) => {
            const ss = segmentStyle(s.segment);
            return (
              <button
                key={s.segment}
                onClick={() => openSegmentDrill(s.segment)}
                className="relative overflow-hidden rounded-lg border bg-card p-4 text-left transition hover:border-foreground/30 hover:shadow-sm"
              >
                <span className={`absolute left-0 top-0 h-full w-1.5 ${ss.accentBar}`} />
                <div className="pl-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{ss.label}</span>
                    <span className="text-base text-muted-foreground/50">▸</span>
                  </div>
                  <p className="mt-2 text-4xl font-semibold tabular-nums">{s.project_count}</p>
                  <p className="text-sm text-muted-foreground">projects · {fmtBillions(s.contract_value_b)}</p>
                  {/* Lifecycle mini-bar */}
                  <div className="mt-4">
                    <LifecycleBar active={s.active_count} sc={s.sc_count} closed={s.closed_count} showLegend={false} inlineCounts />
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${LIFECYCLE.Active.dot}`} />Active</span>
                      <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${LIFECYCLE.SC.dot}`} />Subst. complete</span>
                      <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${LIFECYCLE.Closed.dot}`} />Closed</span>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                    <div><dt className="text-muted-foreground">Avg CPI</dt><dd className="font-medium tabular-nums">{s.avg_cpi !== null ? s.avg_cpi.toFixed(2) : '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Avg SPI</dt><dd className="font-medium tabular-nums">{s.avg_spi !== null ? s.avg_spi.toFixed(2) : '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Margin</dt><dd className="font-medium tabular-nums">{s.margin_pct !== null ? `${s.margin_pct.toFixed(1)}%` : '—'}</dd></div>
                  </dl>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Role-specific KPI strip — shown only for roles with a tailored set.
          Each tile is net-new vs the hero and the operational ribbon below. */}
      {roleKpis && (
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">{roleKpis.title}</h2>
            <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Specific to your role
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{roleKpis.subtitle}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {roleKpis.tiles.map((t) => (
              <KpiCard key={t.label} label={t.label} value={t.value} sub={t.sub} tone={t.tone} />
            ))}
          </div>
        </section>
      )}

      {/* Ribbon 1 — operational portfolio signals (net-new vs the hero, which
          already shows value, budget, margin, lifecycle mix and the CPI/SPI pulse) */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio watchlist</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Open H issues" value={String(operational.open_h_issues)} sub="needs attention" tone={operational.open_h_issues > 0 ? 'warn' : 'ok'} onClick={openOpenHIssues} />
          <KpiCard label="Realised risks" value={String(operational.realised_risks)} sub="pattern signal" tone="info" onClick={openRealisedRisks} />
          <KpiCard label="Cost off-track" value={String(operational.cost_off_track)} sub="projects CPI < 0.95" tone={operational.cost_off_track > 0 ? 'warn' : 'ok'} onClick={openCostOffTrack} />
          <KpiCard label="Schedule off-track" value={String(operational.sched_off_track)} sub="projects SPI < 0.95" tone={operational.sched_off_track > 0 ? 'warn' : 'ok'} onClick={openSchedOffTrack} />
          <KpiCard label="Contingency drawn" value={`$${operational.contingency_drawn_m.toFixed(1)}M`} sub="across portfolio" tone="neutral" onClick={openContingencyDrawn} />
          <KpiCard label="Patterns at emergence" value={String(operational.patterns_at_emergence)} sub="cross-project" tone="info" onClick={openPatterns} />
        </div>
      </section>

      {/* INSIGHTS — 3 mini charts */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio insights</h2>
        <p className="mt-1 text-xs text-muted-foreground">Click any bar, band, or legend item to see the underlying records.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Risks by category</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{Object.values(insights.risk_class_counts).reduce((a, b) => a + b, 0)} total · {`$${insights.risk_exposure_m.toFixed(0)}M`} EMV</span>
            </div>
            <MiniBarChart items={riskBars} maxLabelWidth="w-52" wrapLabels fill onItemClick={openRisksDrill} />
          </div>
          <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Issues by severity</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{Object.values(insights.issue_severity_counts).reduce((a, b) => a + b, 0)} total</span>
            </div>
            <StackedRibbon items={issueBars} onSegmentClick={openIssuesDrill} />
            <p className="mt-3 text-xs text-muted-foreground">
              {insights.issue_severity_counts.H ?? 0} high-severity items currently in flight.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Contingency consumption</h3>
              <span className="text-xs text-muted-foreground">projects by % of contingency used</span>
            </div>
            <StackedRibbon items={contingencyBars} onSegmentClick={openContingencyDrill} />
            <p className="mt-3 text-xs text-muted-foreground">
              Each band is a project&rsquo;s contingency drawn as a share of its contingency budget.
            </p>
          </div>
          </div>
        </div>
      </section>

      {drill && (
        <DrillModal title={drill.title} columns={drill.columns} data={drill.data} seeAllHref={drill.seeAllHref} rowHref={drill.rowHref} onClose={() => setDrill(null)} />
      )}

      {/* HOT 5 — projects needing attention */}
      {hotItems.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">
              Hot list — needs attention
            </h2>
            <span className="text-xs text-muted-foreground">
              Composite score = CPI/SPI deviation + 2×open H issues + realised risks
            </span>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Project</th>
                  <th className="px-3 py-2 text-left font-medium">Segment</th>
                  <th className="px-3 py-2 text-left font-medium">Progress</th>
                  <th className="px-3 py-2 text-center font-medium">CPI</th>
                  <th className="px-3 py-2 text-center font-medium">SPI</th>
                  <th className="px-3 py-2 text-center font-medium" title="Variance at completion — forecast cost overrun (budget − budget/CPI)">VAC</th>
                  <th className="px-3 py-2 text-center font-medium">Contract</th>
                  <th className="px-3 py-2 text-center font-medium" title="Share of contingency budget consumed">Cont. used</th>
                  <th className="px-3 py-2 text-center font-medium" title="Open High-severity issues">Open high issues</th>
                  <th className="px-3 py-2 text-center font-medium" title="Risks that have occurred">Realised risks</th>
                  <th className="px-3 py-2 text-center font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hotItems.map((h, idx) => {
                  const ss = segmentStyle(h.segment);
                  const cpiCls = h.cpi < 0.95 ? 'text-red-600 font-semibold' : h.cpi < 1 ? 'text-amber-600' : 'text-foreground';
                  const spiCls = h.spi < 0.95 ? 'text-red-600 font-semibold' : h.spi < 1 ? 'text-amber-600' : 'text-foreground';
                  const href = `/access/${token}/projects/${h.code}`;
                  const band = h.score >= 5 ? 'high' : h.score >= 3 ? 'med' : 'low';
                  const scoreCls = band === 'high' ? 'bg-red-600 text-white' : band === 'med' ? 'bg-amber-500 text-white' : 'bg-slate-600 text-white';
                  const accentCls = band === 'high' ? 'border-red-500' : band === 'med' ? 'border-amber-400' : 'border-slate-300';
                  const barTone = h.spi < 0.95 ? 'bg-red-500' : h.spi < 1 ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <tr
                      key={h.id}
                      onClick={() => { router.push(href); }}
                      className="cursor-pointer transition hover:bg-muted/40"
                    >
                      <td className={`border-l-4 px-3 py-2.5 text-muted-foreground tabular-nums ${accentCls}`}>{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={href} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {h.name}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {h.code} · <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${statusBadge(h.status)}`}>{statusLabel(h.status)}</span>
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={`h-2 w-2 rounded-full ${ss.dot}`} />
                          {ss.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
                            <span>W{h.current_week}</span>
                            <span>{h.progress_pct}%</span>
                            <span>W{h.est_end_week}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${barTone}`} style={{ width: `${h.progress_pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 text-center tabular-nums ${cpiCls}`}>{h.cpi.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-center tabular-nums ${spiCls}`}>{h.spi.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-center tabular-nums ${h.vac_m < 0 ? 'text-red-600 font-semibold' : 'text-emerald-700'}`}>{h.vac_m < 0 ? '-' : ''}${Math.abs(h.vac_m).toFixed(1)}M</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">${h.contract_m.toFixed(0)}M</td>
                      <td className={`px-3 py-2.5 text-center tabular-nums ${h.contingency_pct == null ? 'text-muted-foreground' : h.contingency_pct >= 100 ? 'text-red-600 font-semibold' : h.contingency_pct >= 50 ? 'text-amber-600' : 'text-foreground'}`}>{h.contingency_pct == null ? '\u2014' : `${h.contingency_pct}%`}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {h.open_h_issues > 0 ? (
                          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900">{h.open_h_issues}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {h.realised_risks > 0 ? (
                          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900">{h.realised_risks}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${scoreCls}`}>{h.score.toFixed(1)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}



      {/* Recent activity — live via Supabase Realtime */}
      <section>
        <button
          type="button"
          onClick={() => setActivityOpen((v) => !v)}
          className={`flex w-full items-center gap-2.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-white px-4 py-3 text-left shadow-sm transition hover:from-indigo-100 hover:via-sky-100 ${activityOpen ? 'mb-3 rounded-b-none border-b-0' : ''}`}
          aria-expanded={activityOpen}
        >
          <h2 className="text-xl font-semibold text-indigo-900">Your recent activity</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
          {activity.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
              {activity.length}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition group-hover:bg-indigo-700">
            {activityOpen ? 'Hide activity' : 'Show activity'}
            <span className="transition-transform" style={{ transform: activityOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
          </span>
        </button>
        {activityOpen && workspaceActivity.count > 0 && (
          <p className="mb-4 text-xs text-muted-foreground">
            Across the workspace: {workspaceActivity.count.toLocaleString()} invocation{workspaceActivity.count === 1 ? '' : 's'}
            {workspaceActivity.latest_at && (
              <>
                {' · '}latest {relativeTime(workspaceActivity.latest_at)}
                {workspaceActivity.latest_by ? ` by ${workspaceActivity.latest_by}` : ''}
              </>
            )}
            {' · '}
            <Link href={`/access/${token}/usage`} className="underline-offset-2 hover:underline">
              View usage
            </Link>
          </p>
        )}
        {activityOpen && (
        <div className="rounded-lg border bg-card divide-y">
          {activity.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              You haven&apos;t invoked an agent yet. Use the floating ✨ Ask AI Assistant button or any
              project page, and your activity will appear here.
            </p>
          ) : (
            activity.map((a) => {
              const ss = a.project_segment ? segmentStyle(a.project_segment) : null;
              const isNew = newIds.has(a.id);
              const isExpanded = expandedIds.has(a.id);
              const promptPreview = a.user_prompt
                ? a.user_prompt.length > 140
                  ? a.user_prompt.slice(0, 140).trim() + '…'
                  : a.user_prompt
                : null;
              const responseStripped = a.output_md ? stripMd(a.output_md) : '';
              const responsePreview = responseStripped
                ? responseStripped.length > 160
                  ? responseStripped.slice(0, 160).trim() + '…'
                  : responseStripped
                : null;
              return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(a.id);
                    }
                  }}
                  className={`relative flex cursor-pointer items-start gap-3 py-3.5 pl-5 pr-4 transition-colors duration-200 hover:bg-muted/40 ${
                    isNew ? 'bg-emerald-50' : ''
                  } ${isExpanded ? 'bg-muted/30' : ''}`}
                >
                  {/* Agent-type accent stripe */}
                  <span className={`absolute left-0 top-0 h-full w-1 ${agentAccent(a.agent_type).bar}`} />

                  {/* Initials avatar */}
                  <div
                    className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700"
                    title={a.colleague_name ?? 'Unknown'}
                  >
                    {colleagueInitials(a.colleague_name)}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-semibold">{a.colleague_name ?? 'Unknown colleague'}</span>
                      {a.is_you && (
                        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
                          You
                        </span>
                      )}
                      {a.role_type && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${roleChipClass(a.role_type)}`}>
                          {shortRole(a.role_type)}
                        </span>
                      )}
                      <span className="text-muted-foreground/60">→</span>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${agentAccent(a.agent_type).chip}`}>
                        {prettyAgent(a.agent_type)}
                      </span>
                      {a.project_name ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          {ss && <span className={`h-2 w-2 rounded-full ${ss.dot}`} />}
                          {a.project_name}
                          <span className="font-mono text-[10px] text-muted-foreground/70">{a.project_code}</span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                          Portfolio
                        </span>
                      )}
                      {isNew && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          new
                        </span>
                      )}
                    </div>
                    {promptPreview && (
                      <p className="mt-1.5 line-clamp-1 text-[13px] italic text-muted-foreground">
                        “{promptPreview}”
                      </p>
                    )}
                    {!isExpanded && responsePreview && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border-l-2 border-slate-200 bg-muted/30 px-2.5 py-1.5">
                        <span className="mt-0.5 flex-none text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">Reply</span>
                        <p className="line-clamp-2 text-[13px] text-foreground/80">{responsePreview}</p>
                      </div>
                    )}
                    {isExpanded && a.output_md && (
                      <div
                        className="mt-3 overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Response header strip — title + Show full report + Collapse */}
                        <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-2.5 text-white">
                          <p className="text-[11px] font-semibold uppercase tracking-wider">
                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                            {prettyAgent(a.agent_type)} response
                          </p>
                          <div className="flex items-center gap-2">
                            <a
                              href={`/access/${token}/report/${a.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
                              title="Opens a polished, printable report in a new tab"
                            >
                              ↗ Show full report
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(a.id);
                              }}
                              className="text-[11px] font-medium text-slate-300 hover:text-white"
                            >
                              Collapse ▴
                            </button>
                          </div>
                        </div>

                        {/* Markdown body with custom-styled elements */}
                        <article className="prose prose-sm max-w-none px-5 py-4 prose-headings:font-semibold prose-h1:text-lg prose-h1:mt-0 prose-h1:mb-3 prose-h2:mt-5 prose-h2:mb-2 prose-h3:mt-3 prose-h3:mb-1 prose-p:text-[13px] prose-p:leading-relaxed prose-li:text-[13px] prose-li:leading-relaxed prose-table:text-xs prose-th:bg-slate-100 prose-th:px-2 prose-th:py-1 prose-td:border-t prose-td:px-2 prose-td:py-1">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => (
                                <h1 className="border-b-2 border-amber-300 pb-2 text-lg font-bold text-slate-900">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="mt-5 mb-2 border-l-4 border-sky-500 pl-2.5 text-base font-semibold text-slate-900">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="mt-3 mb-1 text-sm font-semibold text-slate-700">
                                  {children}
                                </h3>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-slate-900">{children}</strong>
                              ),
                              code: ({ children }) => (
                                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[12px] font-medium text-amber-900 before:content-none after:content-none">
                                  {children}
                                </code>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="my-2 rounded-r-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 not-italic text-slate-800">
                                  {children}
                                </blockquote>
                              ),
                              p: ({ children }) => {
                                const text = extractLeadingText(children).toLowerCase().trim();
                                if (text.startsWith('caveat:') || text.startsWith('note:') || text.startsWith('warning:')) {
                                  return (
                                    <p className="my-2 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                                      {children}
                                    </p>
                                  );
                                }
                                if (text.startsWith('recommendation:') || text.startsWith('recommend:')) {
                                  return (
                                    <p className="my-2 rounded-md border-l-4 border-sky-400 bg-sky-50 px-3 py-2 text-[13px] text-sky-900">
                                      {children}
                                    </p>
                                  );
                                }
                                if (text.startsWith('action:') || text.startsWith('next step:') || text.startsWith('next steps:')) {
                                  return (
                                    <p className="my-2 rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
                                      {children}
                                    </p>
                                  );
                                }
                                return <p>{children}</p>;
                              },
                            }}
                          >
                            {a.output_md}
                          </ReactMarkdown>
                        </article>
                      </div>
                    )}
                  </div>

                  {/* Right column: time + expand chevron */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p
                      className="text-[11px] text-muted-foreground tabular-nums"
                      title={new Date(a.invoked_at).toLocaleString()}
                    >
                      {relativeTime(a.invoked_at)}
                    </p>
                    <span
                      className="text-xs text-muted-foreground transition-transform"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      ▾
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}
      </section>

    </div>
  );
}

function KpiCard({ label, value, sub, tone = 'neutral', onClick }: { label: string; value: string; sub: string; tone?: 'neutral' | 'ok' | 'warn' | 'info'; onClick?: () => void }) {
  const toneCls =
    tone === 'warn' ? 'border-amber-300 bg-amber-50' :
    tone === 'ok' ? 'border-emerald-200 bg-emerald-50/40' :
    tone === 'info' ? 'border-sky-200 bg-sky-50/40' : 'bg-card';
  return (
    <div onClick={onClick} className={`rounded-lg border p-4 ${toneCls} ${onClick ? 'cursor-pointer transition hover:border-foreground/30 hover:shadow-sm' : ''}`}>
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
