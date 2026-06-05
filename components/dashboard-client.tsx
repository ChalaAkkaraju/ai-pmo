'use client';

/**
 * BI-rich dashboard:
 *   Hero — headline + segment donut + lifecycle bar + health pulse
 *   Insights ribbon — 3 mini charts (risk by class, issue severity, CPI distribution)
 *   KPI ribbon — 6 financial KPI cards
 *   Theme cards — clickable, each with embedded lifecycle mini-bar
 *   Inline drill-down — filtered project grid
 *   Recent activity feed
 */

import { CHART } from '@/lib/chart-palette';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { segmentStyle, statusBadge } from '@/lib/segment-style';
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

export interface PortfolioInsights {
  risk_class_counts: Record<string, number>;
  issue_severity_counts: Record<string, number>;
  contingency_buckets: Record<string, number>;
}

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
  open_h_issues: number;
  realised_risks: number;
  score: number;
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
  roleKpis: RoleKpiStrip | null;
  insights: PortfolioInsights;
  hotItems: HotItem[];
  segmentSummaries: SegmentSummary[];
  projects: DashboardProject[];
  recentlyAdded: RecentlyAddedProject[];
  activity: DashboardActivity[];
}

const ALL_STATUSES = ['Active', 'SC', 'Closed'] as const;

function fmtMoneyM(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

function fmtBillions(b: number): string {
  return `$${b.toFixed(2)}B`;
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
}: { active: number; sc: number; closed: number; showLegend?: boolean }) {
  const total = active + sc + closed;
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-blue-500" style={{ width: `${(active / total) * 100}%` }} title={`Active: ${active}`} />
        <div className="bg-emerald-500" style={{ width: `${(sc / total) * 100}%` }} title={`SC: ${sc}`} />
        <div className="bg-gray-400" style={{ width: `${(closed / total) * 100}%` }} title={`Closed: ${closed}`} />
      </div>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Active <strong className="tabular-nums">{active}</strong></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Substantial Completion <strong className="tabular-nums">{sc}</strong></span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" />Closed <strong className="tabular-nums">{closed}</strong></span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Mini horizontal bar chart for insights
// =============================================================================

interface BarItem { label: string; value: number; color: string; }

function MiniBarChart({ items, maxLabelWidth = 'flex-1', wrapLabels = false }: { items: BarItem[]; maxLabelWidth?: string; wrapLabels?: boolean }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} className="flex items-center gap-3 text-xs">
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

/** Compact vertical bar chart — for short-label distributions (severity, CPI bands). */
function VerticalBarChart({ items, trackHeight = 112 }: { items: BarItem[]; trackHeight?: number }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex items-end justify-around gap-3">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] font-semibold tabular-nums text-foreground">{item.value}</span>
            <div className="flex w-full max-w-[52px] items-end overflow-hidden rounded bg-muted" style={{ height: trackHeight }}>
              <div className="w-full rounded-t transition-all" style={{ height: `${pct}%`, backgroundColor: item.color, minHeight: item.value > 0 ? 4 : 0 }} />
            </div>
            <span className="text-center text-[10px] leading-tight text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main
// =============================================================================

function PortfolioEvBand({ ev }: { ev: PortfolioEv }) {
  const money = (n: number | null) => {
    if (n == null) return '\u2014';
    const m = n / 1_000_000;
    return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
  };
  const ratioTone = (v: number | null) =>
    v == null ? 'text-slate-900' : v < 0.97 ? 'text-red-600' : v >= 1.0 ? 'text-emerald-700' : 'text-amber-700';
  const sched = ev.spi == null ? null : ev.spi < 0.97 ? 'behind schedule' : ev.spi > 1.03 ? 'ahead of schedule' : 'on schedule';
  const cost = ev.cpi == null ? null : ev.cpi < 0.97 ? 'over cost' : ev.cpi > 1.03 ? 'under cost' : 'on budget';
  const trouble = (ev.cpi != null && ev.cpi < 0.97) || (ev.spi != null && ev.spi < 0.97);
  const great = ev.cpi != null && ev.cpi >= 1.0 && ev.spi != null && ev.spi >= 1.0;
  const chip = trouble ? 'bg-red-100 text-red-800' : great ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
  const readout = [sched, cost].filter(Boolean).join(' \u00b7 ') || 'in progress';

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
          {(sched || cost) && <span className={`rounded-full px-3 py-1 text-xs font-medium ${chip}`}>{readout}</span>}
          {ev.behind_count > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">{ev.behind_count} behind</span>}
          {ev.over_count > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">{ev.over_count} over cost</span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Cell label="Budget (BAC)" value={money(ev.bac)} />
        <Cell label="Planned (PV)" value={money(ev.pv)} accent={CHART.planned} />
        <Cell label="Earned (EV)" value={money(ev.ev)} accent={CHART.earned} />
        <Cell label="Actual (AC)" value={money(ev.ac)} accent={CHART.actual} />
        <Cell label="CPI · cost" value={ev.cpi == null ? '\u2014' : ev.cpi.toFixed(2)} cls={ratioTone(ev.cpi)} />
        <Cell label="SPI · sched" value={ev.spi == null ? '\u2014' : ev.spi.toFixed(2)} cls={ratioTone(ev.spi)} />
        <Cell label="Forecast (EAC)" value={money(ev.eac)} />
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
  roleKpis,
  insights,
  hotItems,
  segmentSummaries,
  projects,
  recentlyAdded,
  activity: initialActivity,
}: Props) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());

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

  const filteredProjects = useMemo(() => {
    if (!selectedSegment) return [];
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (p.segment !== selectedSegment) return false;
      if (selectedStatuses.size > 0 && !selectedStatuses.has(p.status)) return false;
      if (q) {
        const hay = `${p.name} ${p.code} ${p.client}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [projects, selectedSegment, query, selectedStatuses]);

  function toggleSegment(seg: string) {
    if (selectedSegment === seg) {
      setSelectedSegment(null); setQuery(''); setSelectedStatuses(new Set());
    } else {
      setSelectedSegment(seg); setQuery(''); setSelectedStatuses(new Set());
    }
  }

  function toggleStatus(s: string) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

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
    { label: 'High',   value: insights.issue_severity_counts.H ?? 0, color: '#ef4444' },
    { label: 'Medium', value: insights.issue_severity_counts.M ?? 0, color: '#f59e0b' },
    { label: 'Low',    value: insights.issue_severity_counts.L ?? 0, color: '#10b981' },
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
                  <div key={s.segment}>
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
            <LifecycleBar active={totalActive} sc={totalSc} closed={totalClosed} />
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Portfolio health pulse</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{kpis.avg_cpi.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">CPI</span>
                <span className="mx-1 text-muted-foreground/50">·</span>
                <span className="text-3xl font-semibold tabular-nums">{kpis.avg_spi.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">SPI</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {(() => {
                  const healthy = kpis.avg_cpi >= 1 && kpis.avg_spi >= 1;
                  const warning = kpis.avg_cpi < 0.95 || kpis.avg_spi < 0.95;
                  const dotCls = warning ? 'bg-amber-500' : healthy ? 'bg-emerald-500' : 'bg-blue-500';
                  const label = warning ? 'Below tolerance — needs attention' : healthy ? 'On or ahead of plan' : 'Within tolerance';
                  return (<><span className={`h-2 w-2 rounded-full ${dotCls}`} /><p className="text-xs text-muted-foreground">{label}</p></>);
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
        <PortfolioEvBand ev={portfolioEv} />
      )}

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

      {/* INSIGHTS — 3 mini charts */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio insights</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4 md:col-span-2">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Risks by category</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{Object.values(insights.risk_class_counts).reduce((a, b) => a + b, 0)} total</span>
            </div>
            <MiniBarChart items={riskBars} maxLabelWidth="w-52" wrapLabels />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Issues by severity</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{Object.values(insights.issue_severity_counts).reduce((a, b) => a + b, 0)} total</span>
            </div>
            <VerticalBarChart items={issueBars} />
            <p className="mt-3 text-xs text-muted-foreground">
              {insights.issue_severity_counts.H ?? 0} high-severity items currently in flight.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Cost-performance distribution</h3>
              <span className="text-xs text-muted-foreground">project count by CPI deviation</span>
            </div>
            <VerticalBarChart items={contingencyBars} />
            <p className="mt-3 text-xs text-muted-foreground">
              Bands estimate contingency consumption from CPI deviation.
            </p>
          </div>
        </div>
      </section>

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
                  <th className="px-3 py-2 text-right font-medium">CPI</th>
                  <th className="px-3 py-2 text-right font-medium">SPI</th>
                  <th className="px-3 py-2 text-right font-medium" title="Open High-severity issues">Open high issues</th>
                  <th className="px-3 py-2 text-right font-medium" title="Risks that have occurred">Realised risks</th>
                  <th className="px-3 py-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hotItems.map((h, idx) => {
                  const ss = segmentStyle(h.segment);
                  const cpiCls = h.cpi < 0.95 ? 'text-red-600 font-semibold' : h.cpi < 1 ? 'text-amber-600' : 'text-foreground';
                  const spiCls = h.spi < 0.95 ? 'text-red-600 font-semibold' : h.spi < 1 ? 'text-amber-600' : 'text-foreground';
                  const href = `/access/${token}/projects/${h.code}`;
                  const barTone = h.status === 'SC' ? 'bg-teal-500' : h.status === 'Closed' ? 'bg-slate-400' : 'bg-amber-500';
                  return (
                    <tr
                      key={h.id}
                      onClick={() => { window.location.href = href; }}
                      className="cursor-pointer transition hover:bg-muted/40"
                    >
                      <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link href={href} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {h.name}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {h.code} · <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${statusBadge(h.status)}`}>{h.status}</span>
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
                      <td className={`px-3 py-2.5 text-right tabular-nums ${cpiCls}`}>{h.cpi.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${spiCls}`}>{h.spi.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {h.open_h_issues > 0 ? (
                          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900">{h.open_h_issues}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {h.realised_risks > 0 ? (
                          <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">{h.realised_risks}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-block rounded bg-foreground/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-background">{h.score.toFixed(1)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ribbon 1 — operational portfolio signals (net-new vs the hero, which
          already shows value, budget, margin, lifecycle mix and the CPI/SPI pulse) */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio watchlist</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Open H issues" value={String(operational.open_h_issues)} sub="needs attention" tone={operational.open_h_issues > 0 ? 'warn' : 'ok'} />
          <KpiCard label="Realised risks" value={String(operational.realised_risks)} sub="pattern signal" tone="info" />
          <KpiCard label="Cost off-track" value={String(operational.cost_off_track)} sub="projects CPI < 0.95" tone={operational.cost_off_track > 0 ? 'warn' : 'ok'} />
          <KpiCard label="Schedule off-track" value={String(operational.sched_off_track)} sub="projects SPI < 0.95" tone={operational.sched_off_track > 0 ? 'warn' : 'ok'} />
          <KpiCard label="Contingency drawn" value={`$${operational.contingency_drawn_m.toFixed(1)}M`} sub="across portfolio" tone="neutral" />
          <KpiCard label="Patterns at emergence" value={String(operational.patterns_at_emergence)} sub="cross-project" tone="info" />
        </div>
      </section>

      {/* Ribbon 2 — Segment cards (click to drill in) */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Segments</h2>
          {selectedSegment && (
            <button onClick={() => toggleSegment(selectedSegment)} className="text-xs text-muted-foreground hover:text-foreground">Collapse</button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {segmentSummaries.map((s) => {
            const ss = segmentStyle(s.segment);
            const active = selectedSegment === s.segment;
            return (
              <button
                key={s.segment}
                onClick={() => toggleSegment(s.segment)}
                className={`relative overflow-hidden rounded-lg border bg-card p-4 text-left transition ${active ? 'border-foreground/40 shadow-md ring-1 ring-foreground/10' : 'hover:border-foreground/30 hover:shadow-sm'}`}
              >
                <span className={`absolute left-0 top-0 h-full w-1.5 ${ss.accentBar}`} />
                <div className="pl-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{ss.label}</span>
                    <span className="text-base text-muted-foreground/50">{active ? '▾' : '▸'}</span>
                  </div>
                  <p className="mt-2 text-4xl font-semibold tabular-nums">{s.project_count}</p>
                  <p className="text-sm text-muted-foreground">projects · {fmtBillions(s.contract_value_b)}</p>
                  {/* Lifecycle mini-bar */}
                  <div className="mt-4">
                    <LifecycleBar active={s.active_count} sc={s.sc_count} closed={s.closed_count} showLegend={false} />
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span><span className="font-medium text-foreground tabular-nums">{s.active_count}</span> Active</span>
                      <span><span className="font-medium text-foreground tabular-nums">{s.sc_count}</span> SC</span>
                      <span><span className="font-medium text-foreground tabular-nums">{s.closed_count}</span> Closed</span>
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

      {/* Inline drill-down */}
      {selectedSegment && (
        <section className="rounded-lg border bg-muted/30 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {segmentStyle(selectedSegment).label} projects
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredProjects.length}{filteredProjects.length !== projects.filter((p) => p.segment === selectedSegment).length ? ` of ${projects.filter((p) => p.segment === selectedSegment).length}` : ''})
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <input type="text" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-48 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30" />
              {ALL_STATUSES.map((s) => {
                const active = selectedStatuses.has(s);
                return (
                  <button key={s} onClick={() => toggleStatus(s)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? statusBadge(s) : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/70'}`}>{s}</button>
                );
              })}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full rounded-md border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">No projects in this theme match your filters.</div>
            ) : (
              filteredProjects.map((p) => {
                const ss = segmentStyle(p.segment);
                return (
                  <Link key={p.id} href={`/access/${token}/projects/${p.code}`} className="group relative overflow-hidden rounded-md border bg-card transition hover:border-foreground/30 hover:shadow-sm">
                    <span className={`absolute left-0 top-0 h-full w-1 ${ss.accentBar}`} />
                    <div className="p-4 pl-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold leading-tight line-clamp-2">{p.name}</h3>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {p.is_new && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">New</span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(p.status)}`}>{p.status}</span>
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.code} · {p.client}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div><dt className="text-muted-foreground">Week</dt><dd className="font-medium">{p.current_week}</dd></div>
                        <div><dt className="text-muted-foreground">Contract</dt><dd className="font-medium">{fmtMoneyM(p.contract_value_current)}</dd></div>
                      </dl>
                    </div>
                  </Link>
                );
              })
            )}
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

function KpiCard({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub: string; tone?: 'neutral' | 'ok' | 'warn' | 'info' }) {
  const toneCls =
    tone === 'warn' ? 'border-amber-300 bg-amber-50' :
    tone === 'ok' ? 'border-emerald-200 bg-emerald-50/40' :
    tone === 'info' ? 'border-sky-200 bg-sky-50/40' : 'bg-card';
  return (
    <div className={`rounded-lg border p-4 ${toneCls}`}>
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
