/**
 * Structured-model facts for agent grounding — Phase 5.
 *
 * Assembles the AUTHORITATIVE figures (earned value, schedule, resources,
 * margin, target-finish breach) from the canonical model, joined by WBS code,
 * into a compact markdown block injected into the agent context. This is what
 * lets the AI narrate from real numbers instead of older markdown reports.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { computeEv } from './earned-value';
import { computeMarginBridge } from './margin';
import { computeLoad, type ResAssignment } from './resource-load';
import { roleLabel } from './roles';
import type { RoleType } from './types';

function money(n: number | null): string {
  if (n == null) return '—';
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
}
function d(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function loadStructuredFacts(
  supabase: SupabaseClient,
  projectId: string,
  project: Record<string, unknown>,
): Promise<string | null> {
  const [wpRes, taskRes, costRes, resRes] = await Promise.all([
    supabase.from('work_packages').select('wbs_code, parent_wbs_code, name, budget_bac, baseline_bac, target_finish, is_billing_element').eq('project_id', projectId),
    supabase.from('tasks').select('wbs_code, percent_complete, finish_date').eq('project_id', projectId),
    supabase.from('cost_actuals').select('actual_cost, planned_value').eq('project_id', projectId),
    supabase.from('resource_assignments').select('resource_role, period, planned_work_hours').eq('project_id', projectId),
  ]);

  const wps = (wpRes.error ? [] : wpRes.data ?? []) as Array<Record<string, unknown>>;
  if (wps.length === 0) return null; // not synced from a system of record yet

  const tasks = (taskRes.error ? [] : taskRes.data ?? []) as Array<Record<string, unknown>>;
  const cost = (costRes.error ? [] : costRes.data ?? []) as Array<Record<string, unknown>>;
  const res = (resRes.error ? [] : resRes.data ?? []) as ResAssignment[];

  const leaves = wps.filter((w) => w.parent_wbs_code);
  const ev = computeEv(
    leaves.map((l) => ({ wbs_code: String(l.wbs_code), budget_bac: l.budget_bac as number | null })),
    tasks.map((t) => ({ wbs_code: (t.wbs_code as string) ?? null, percent_complete: t.percent_complete as number | null })),
    cost.map((c) => ({ actual_cost: c.actual_cost as number | null, planned_value: c.planned_value as number | null })),
  );

  const out: string[] = [];
  out.push('# Structured model — authoritative figures (system of record)');
  out.push(
    'Use THESE figures when stating any cost, schedule, resource or margin fact. They are computed live from the canonical WBS, schedule and cost actuals (joined by WBS code) and OVERRIDE any older variance-report narrative in the context.',
  );

  if (ev.ready) {
    const costState = ev.cpi == null ? '' : ev.cpi < 0.97 ? ' (over cost)' : ev.cpi > 1.03 ? ' (under cost)' : ' (on budget)';
    const schedState = ev.spi == null ? '' : ev.spi < 0.97 ? ' (behind)' : ev.spi > 1.03 ? ' (ahead)' : ' (on schedule)';
    out.push(
      `## Earned value\n` +
        `- BAC ${money(ev.bac)} · PV ${money(ev.pv)} · EV ${money(ev.ev)} · AC ${money(ev.ac)}\n` +
        `- CPI ${ev.cpi?.toFixed(2) ?? '—'}${costState} · SPI ${ev.spi?.toFixed(2) ?? '—'}${schedState} · EAC ${money(ev.eac)} · VAC ${money(ev.vac)} · ${ev.complete_pct.toFixed(0)}% complete`,
    );
  }

  // Schedule + target-finish breach
  if (tasks.length > 0) {
    const done = tasks.filter((t) => Number(t.percent_complete) >= 100).length;
    const inprog = tasks.filter((t) => { const p = Number(t.percent_complete); return p > 0 && p < 100; }).length;
    const notStarted = tasks.length - done - inprog;
    const finishes = tasks.map((t) => Date.parse(String(t.finish_date))).filter((n) => !Number.isNaN(n));
    const forecast = finishes.length ? Math.max(...finishes) : null;
    const targets = leaves.map((l) => Date.parse(String(l.target_finish))).filter((n) => !Number.isNaN(n));
    const envelope = targets.length ? Math.max(...targets) : null;
    let sched = `## Schedule\n- ${tasks.length} tasks: ${done} done, ${inprog} in progress, ${notStarted} not started`;
    if (forecast) {
      sched += `\n- Bottom-up forecast finish: ${d(forecast)}`;
      if (envelope) {
        const days = Math.round((forecast - envelope) / 86400000);
        sched += days > 0
          ? `\n- ⚠ TARGET-FINISH BREACH: forecast is ${days} day(s) beyond the top-down target envelope (${d(envelope)}). Flag this.`
          : `\n- Within the top-down target envelope (${d(envelope)}), ${Math.abs(days)} day(s) of headroom.`;
      }
    }
    out.push(sched);
  }

  // Resources
  const load = computeLoad(res, true);
  if (load.ready) {
    const over = load.roles.filter((r) => r.peakFte > r.capacityFte);
    let r = '## Resources (FTE demand vs capacity)';
    if (over.length > 0) {
      r += `\n- Over-allocated disciplines: ${over.map((o) => `${roleLabel(o.role as RoleType)} (peak ${o.peakFte.toFixed(1)} vs cap ${o.capacityFte}, over ${o.overMonths} mo)`).join('; ')}`;
    } else {
      r += `\n- No discipline exceeds capacity (peak demand within the resource pool).`;
    }
    out.push(r);
  }

  // Margin (three-state reconciliation)
  let soldBudget = 0;
  let anyBaseline = false;
  for (const l of leaves) { if (l.baseline_bac != null) { soldBudget += Number(l.baseline_bac); anyBaseline = true; } }
  if (anyBaseline) {
    const mb = computeMarginBridge({
      soldContract: Number(project.sold_contract_value) || 0,
      soldBudget,
      currentContract: Number(project.contract_value_current) || 0,
      plannedBudget: ev.bac,
      eac: ev.eac,
    });
    if (mb.ready) {
      const slip = mb.forecastMarginPct - mb.soldMarginPct;
      const verdict = slip < -0.5 ? 'BELOW the margin we sold' : slip > 0.5 ? 'above the margin we sold' : 'on the margin we sold';
      out.push(
        `## Margin (as-sold → as-planned → as-built)\n` +
          `- Sold ${mb.soldMarginPct.toFixed(1)}% → Planned ${mb.plannedMarginPct.toFixed(1)}% → Forecast ${mb.forecastMarginPct.toFixed(1)}% (${slip >= 0 ? '+' : ''}${slip.toFixed(1)} pts vs sold — ${verdict})\n` +
          `- Erosion drivers: budget growth ${money(mb.dBudget)}, contract change ${money(mb.dContract)}, cost performance ${money(mb.dExecution)}`,
      );
    }
  }

  return out.length > 2 ? out.join('\n\n') : null;
}
