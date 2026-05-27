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

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { segmentStyle, statusBadge } from '@/lib/segment-style';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

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
  cpi: number;
  spi: number;
  open_h_issues: number;
  realised_risks: number;
  score: number;
}

interface Props {
  token: string;
  roleName: string;
  roleDisplayName: string;
  roleDescription: string;
  canWrite: boolean;
  allowedAgentCount: number;
  kpis: PortfolioKpis;
  insights: PortfolioInsights;
  hotItems: HotItem[];
  segmentSummaries: SegmentSummary[];
  projects: DashboardProject[];
  activity: DashboardActivity[];
}

const ALL_STATUSES = ['Active', 'SC', 'Closed'] as const;

function fmtMoneyM(n: number): string {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

function fmtBillions(b: number): string {
  return `$${b.toFixed(2)}B`;
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

function MiniBarChart({ items, maxLabelWidth = 'flex-1' }: { items: BarItem[]; maxLabelWidth?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={item.label} className="flex items-center gap-3 text-xs">
            <div className={`${maxLabelWidth} truncate text-muted-foreground`} title={item.label}>{item.label}</div>
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

// =============================================================================
// Main
// =============================================================================

export function DashboardClient({
  token,
  roleName,
  roleDisplayName,
  roleDescription,
  canWrite,
  allowedAgentCount,
  kpis,
  insights,
  hotItems,
  segmentSummaries,
  projects,
  activity: initialActivity,
}: Props) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());

  // Live agent-activity feed — seeded by server-rendered prop, updated by
  // Supabase Realtime subscription on the agent_outputs table.
  const [activity, setActivity] = useState<DashboardActivity[]>(initialActivity);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
  }, []);

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
      label: cls.length > 26 ? cls.slice(0, 24) + '…' : cls,
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
      {/* Welcome */}
      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {roleDisplayName}
        </p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight">Welcome, {roleName}</h1>
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

          <div className="flex flex-col items-center justify-center md:px-4">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">Segment mix</p>
            <SegmentDonut segments={segmentSummaries} />
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {segmentSummaries.map((s) => {
                const ss = segmentStyle(s.segment);
                return (
                  <span key={s.segment} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${ss.dot}`} />
                    {ss.label} <strong className="tabular-nums">{s.project_count}</strong>
                  </span>
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

      {/* INSIGHTS — 3 mini charts */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio insights</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Risks by cross-cutting class</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{Object.values(insights.risk_class_counts).reduce((a, b) => a + b, 0)} total</span>
            </div>
            <MiniBarChart items={riskBars} />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Issues by severity</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{Object.values(insights.issue_severity_counts).reduce((a, b) => a + b, 0)} total</span>
            </div>
            <MiniBarChart items={issueBars} maxLabelWidth="w-16" />
            <p className="mt-3 text-xs text-muted-foreground">
              {insights.issue_severity_counts.H ?? 0} high-severity items currently in flight.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Cost-performance distribution</h3>
              <span className="text-xs text-muted-foreground">project count by CPI deviation</span>
            </div>
            <MiniBarChart items={contingencyBars} maxLabelWidth="w-16" />
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
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Project</th>
                  <th className="px-4 py-2 text-left">Segment</th>
                  <th className="px-4 py-2 text-left">Stage</th>
                  <th className="px-4 py-2 text-right">CPI</th>
                  <th className="px-4 py-2 text-right">SPI</th>
                  <th className="px-4 py-2 text-right">Open H</th>
                  <th className="px-4 py-2 text-right">Realised</th>
                  <th className="px-4 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {hotItems.map((h, idx) => {
                  const ss = segmentStyle(h.segment);
                  const cpiCls = h.cpi < 0.95 ? 'text-red-600 font-semibold' : h.cpi < 1 ? 'text-amber-600' : 'text-foreground';
                  const spiCls = h.spi < 0.95 ? 'text-red-600 font-semibold' : h.spi < 1 ? 'text-amber-600' : 'text-foreground';
                  return (
                    <tr key={h.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/access/${token}/projects/${h.code}`} className="font-medium hover:underline">
                          {h.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{h.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={`h-2 w-2 rounded-full ${ss.dot}`} />
                          {ss.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(h.status)}`}>
                          {h.status} · W{h.current_week}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${cpiCls}`}>{h.cpi.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${spiCls}`}>{h.spi.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {h.open_h_issues > 0 ? (
                          <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900">
                            {h.open_h_issues}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {h.realised_risks > 0 ? (
                          <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                            {h.realised_risks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block rounded bg-foreground/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-background">
                          {h.score.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ribbon 1 — KPIs */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Portfolio KPIs</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Contract value" value={fmtBillions(kpis.total_contract_b)} sub="current total" />
          <KpiCard label="Approved budget" value={fmtBillions(kpis.total_budget_b)} sub="cost-side" />
          <KpiCard label="Active projects" value={String(kpis.active_count)} sub={`of ${totalProjects}`} />
          <KpiCard label="Avg CPI / SPI" value={`${kpis.avg_cpi.toFixed(2)} / ${kpis.avg_spi.toFixed(2)}`} sub="weighted by contract" tone={kpis.avg_cpi < 0.95 || kpis.avg_spi < 0.95 ? 'warn' : 'ok'} />
          <KpiCard label="Open H issues" value={String(kpis.open_h_issues)} sub="needs attention" tone={kpis.open_h_issues > 0 ? 'warn' : 'ok'} />
          <KpiCard label="Realised risks" value={String(kpis.realised_risks)} sub="pattern signal" tone="info" />
        </div>
      </section>

      {/* Ribbon 2 — Theme cards */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">Themes (click to drill in)</h2>
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
                    <span className="text-xs text-muted-foreground">{active ? 'Expanded ▾' : 'Click ▸'}</span>
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
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><dt className="text-muted-foreground">Avg CPI</dt><dd className="font-medium tabular-nums">{s.avg_cpi !== null ? s.avg_cpi.toFixed(2) : '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Avg SPI</dt><dd className="font-medium tabular-nums">{s.avg_spi !== null ? s.avg_spi.toFixed(2) : '—'}</dd></div>
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
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(p.status)}`}>{p.status}</span>
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
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Recent agent activity</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-800">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        </div>
        <div className="rounded-lg border bg-card divide-y">
          {activity.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No agent activity yet. Invoke an agent from any project page or use the floating ✨ Ask AI Assistant button to see it appear here.
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
                  className={`flex cursor-pointer items-start gap-3 p-4 transition-colors duration-200 hover:bg-muted/40 ${
                    isNew ? 'bg-emerald-50' : ''
                  } ${isExpanded ? 'bg-muted/30' : ''}`}
                >
                  {/* Initials avatar */}
                  <div
                    className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700"
                    title={a.colleague_name ?? 'Unknown'}
                  >
                    {colleagueInitials(a.colleague_name)}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                      <span className="font-semibold">{a.colleague_name ?? 'Unknown colleague'}</span>
                      {a.role_type && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${roleChipClass(a.role_type)}`}>
                          {shortRole(a.role_type)}
                        </span>
                      )}
                      <span className="text-muted-foreground">asked</span>
                      <span className="font-medium">{prettyAgent(a.agent_type)}</span>
                      {a.project_name && (
                        <>
                          <span className="text-muted-foreground">on</span>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            {ss && <span className={`h-2 w-2 rounded-full ${ss.dot}`} />}
                            {a.project_name}
                            <span className="font-mono text-[11px] text-muted-foreground/80">({a.project_code})</span>
                          </span>
                        </>
                      )}
                      {!a.project_name && (
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">
                          · portfolio-level
                        </span>
                      )}
                      {isNew && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                          new
                        </span>
                      )}
                    </div>
                    {promptPreview && (
                      <p className="mt-1 line-clamp-2 text-sm italic text-muted-foreground">
                        “{promptPreview}”
                      </p>
                    )}
                    {!isExpanded && responsePreview && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-foreground/80">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Response · </span>
                        {responsePreview}
                      </p>
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
      </section>

      {/* Footer */}
      <footer className="border-t pt-6 text-xs text-muted-foreground">
        <p>
          Token <code className="rounded bg-muted px-1.5 py-0.5">{token.slice(0, 8)}…</code>
          {' · '}{canWrite ? 'Write access' : 'Read-only'}
          {' · '}{allowedAgentCount} agent{allowedAgentCount === 1 ? '' : 's'} available
        </p>
      </footer>
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
