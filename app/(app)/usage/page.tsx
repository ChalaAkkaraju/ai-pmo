/**
 * Usage & cost page — agent-wise and user-wise activity metrics.
 *
 * Visible to every role (per product decision). Built entirely from the
 * agent_outputs table, which records one row per agent invocation with its
 * agent_type, invoking role, timestamp, tokens_used and cost_usd.
 *
 * "Sessions" are not yet stored as a distinct concept — each row is a single
 * agent invocation — so counts here are invocation counts. A nullable
 * session_id is being added so true session counts can accrue going forward
 * (see migration 0008 + the chat/widget session plumbing).
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionRole } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getCatalogEntry } from '@/lib/agent-catalog';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

function prettyAgent(t: string): string {
  return t.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function agentName(t: string): string {
  return getCatalogEntry(t as never)?.name ?? prettyAgent(t);
}
function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function relTime(iso: string): string {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function UsagePage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('agent_outputs')
    .select('agent_type, invoked_at, tokens_used, cost_usd, roles:invoked_by_role_id(name, role_type)')
    .order('invoked_at', { ascending: false })
    .limit(10000);

  type JoinedRole = { name: string; role_type: string };
  const rows = (data ?? []) as Array<{
    agent_type: string;
    invoked_at: string;
    tokens_used: number | null;
    cost_usd: number | string | null;
    roles: JoinedRole | JoinedRole[] | null;
  }>;

  // Chat sessions (distinct session_id). Separate, resilient query: if the
  // session_id column is somehow missing, this returns no rows rather than
  // blanking the whole page.
  const { data: sessData } = await supabase
    .from('agent_outputs')
    .select('session_id, agent_type, roles:invoked_by_role_id(name)')
    .not('session_id', 'is', null)
    .limit(10000);
  const sessRows = (sessData ?? []) as Array<{
    session_id: string | null;
    agent_type: string;
    roles: { name: string } | { name: string }[] | null;
  }>;
  const totalSessions = new Set(sessRows.map((r) => r.session_id)).size;
  const sessionsByAgent = new Map<string, Set<string>>();
  const sessionsByUser = new Map<string, Set<string>>();
  for (const r of sessRows) {
    if (!r.session_id) continue;
    if (!sessionsByAgent.has(r.agent_type)) sessionsByAgent.set(r.agent_type, new Set());
    sessionsByAgent.get(r.agent_type)!.add(r.session_id);
    const role = Array.isArray(r.roles) ? r.roles[0] ?? null : r.roles;
    const nm = role?.name ?? 'Unknown';
    if (!sessionsByUser.has(nm)) sessionsByUser.set(nm, new Set());
    sessionsByUser.get(nm)!.add(r.session_id);
  }

  // -------- Totals --------
  let totalCost = 0;
  let totalTokens = 0;
  for (const r of rows) {
    totalCost += Number(r.cost_usd ?? 0);
    totalTokens += Number(r.tokens_used ?? 0);
  }
  const totalInv = rows.length;
  const avgCost = totalInv > 0 ? totalCost / totalInv : 0;

  // -------- By agent --------
  const byAgentMap = new Map<string, { inv: number; tokens: number; cost: number }>();
  for (const r of rows) {
    const e = byAgentMap.get(r.agent_type) ?? { inv: 0, tokens: 0, cost: 0 };
    e.inv += 1;
    e.tokens += Number(r.tokens_used ?? 0);
    e.cost += Number(r.cost_usd ?? 0);
    byAgentMap.set(r.agent_type, e);
  }
  const byAgent = [...byAgentMap.entries()]
    .map(([agent_type, v]) => ({
      agent_type,
      name: agentName(agent_type),
      ...v,
      sessions: sessionsByAgent.get(agent_type)?.size ?? 0,
    }))
    .sort((a, b) => b.inv - a.inv);
  const maxAgentInv = Math.max(1, ...byAgent.map((a) => a.inv));

  // -------- By user --------
  const byUserMap = new Map<
    string,
    { inv: number; tokens: number; cost: number; last: string; role_type: string; agents: Map<string, number> }
  >();
  for (const r of rows) {
    const role = Array.isArray(r.roles) ? r.roles[0] ?? null : r.roles;
    const name = role?.name ?? 'Unknown';
    const e =
      byUserMap.get(name) ??
      { inv: 0, tokens: 0, cost: 0, last: r.invoked_at, role_type: role?.role_type ?? '', agents: new Map<string, number>() };
    e.inv += 1;
    e.tokens += Number(r.tokens_used ?? 0);
    e.cost += Number(r.cost_usd ?? 0);
    if (r.invoked_at > e.last) e.last = r.invoked_at;
    e.agents.set(r.agent_type, (e.agents.get(r.agent_type) ?? 0) + 1);
    byUserMap.set(name, e);
  }
  const byUser = [...byUserMap.entries()]
    .map(([name, v]) => {
      let top = '';
      let topN = -1;
      for (const [a, n] of v.agents) {
        if (n > topN) {
          topN = n;
          top = a;
        }
      }
      return {
        name,
        role_type: v.role_type,
        inv: v.inv,
        tokens: v.tokens,
        cost: v.cost,
        last: v.last,
        topAgent: top ? agentName(top) : '—',
        sessions: sessionsByUser.get(name)?.size ?? 0,
      };
    })
    .sort((a, b) => b.inv - a.inv);
  const maxUserInv = Math.max(1, ...byUser.map((u) => u.inv));

  return (
    <div className="container mx-auto max-w-screen-xl px-8 py-8 space-y-7">
      {/* Title + breadcrumb */}
      <section>
        <Link href={`/dashboard`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Usage &amp; cost</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agent invocations and chat sessions across the workspace. Sessions count chat threads started
          since session tracking was enabled, so they build up over time.
        </p>
      </section>

      {/* Totals */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Invocations', value: totalInv.toLocaleString() },
          { label: 'Sessions', value: totalSessions.toLocaleString() },
          { label: 'Total cost', value: fmtUsd(totalCost) },
          { label: 'Total tokens', value: fmtTokens(totalTokens) },
          { label: 'Avg / invocation', value: fmtUsd(avgCost) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border bg-muted/40 p-4">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
          </div>
        ))}
      </section>

      {/* By agent */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">By agent</h2>
        <div className="mt-3 overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1.6fr_2.4fr_0.7fr_0.8fr_1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Agent</span>
            <span>Invocations</span>
            <span className="text-right">Sessions</span>
            <span className="text-right">Tokens</span>
            <span className="text-right">Cost</span>
          </div>
          {byAgent.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No agent activity recorded yet.</p>
          ) : (
            byAgent.map((a) => (
              <div key={a.agent_type} className="grid grid-cols-[1.6fr_2.4fr_0.7fr_0.8fr_1fr] items-center gap-3 border-b px-4 py-2.5 last:border-0">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="flex items-center gap-3">
                  <span className="h-2.5 w-full max-w-[200px] overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.round((a.inv / maxAgentInv) * 100)}%` }}
                    />
                  </span>
                  <strong className="text-sm tabular-nums">{a.inv}</strong>
                </span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">{a.sessions.toLocaleString()}</span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">{fmtTokens(a.tokens)}</span>
                <span className="text-right text-sm tabular-nums">{fmtUsd(a.cost)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* By user */}
      <section>
        <h2 className="text-base font-medium uppercase tracking-wider text-muted-foreground">By user</h2>
        <div className="mt-3 overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1.4fr_2fr_1.4fr_0.7fr_0.7fr_0.9fr_0.9fr] gap-3 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>User</span>
            <span>Invocations</span>
            <span>Most-used agent</span>
            <span className="text-right">Sessions</span>
            <span className="text-right">Tokens</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Last active</span>
          </div>
          {byUser.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No user activity recorded yet.</p>
          ) : (
            byUser.map((u) => (
              <div key={u.name} className="grid grid-cols-[1.4fr_2fr_1.4fr_0.7fr_0.7fr_0.9fr_0.9fr] items-center gap-3 border-b px-4 py-2.5 last:border-0">
                <span className="text-sm font-medium">{u.name}</span>
                <span className="flex items-center gap-3">
                  <span className="h-2.5 w-full max-w-[180px] overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.round((u.inv / maxUserInv) * 100)}%` }}
                    />
                  </span>
                  <strong className="text-sm tabular-nums">{u.inv}</strong>
                </span>
                <span className="truncate text-sm text-muted-foreground">{u.topAgent}</span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">{u.sessions.toLocaleString()}</span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">{fmtTokens(u.tokens)}</span>
                <span className="text-right text-sm tabular-nums">{fmtUsd(u.cost)}</span>
                <span className="text-right text-xs text-muted-foreground">{relTime(u.last)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
