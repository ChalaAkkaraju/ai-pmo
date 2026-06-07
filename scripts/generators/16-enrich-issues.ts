/**
 * Enrich the issue log — SLA target, cost/schedule impact, escalation state,
 * root cause + recurrence. Pure data, NO LLM. Deterministic by issue id.
 * (Age, overdue, priority, MTTR are computed at read time — not stored.)
 *
 * Requires migration 0026. Idempotent (skips rows already enriched).
 *   ./node_modules/.bin/tsx scripts/generators/16-enrich-issues.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log } from '../lib/log';

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ri = (r: () => number, lo: number, hi: number) => Math.round(lerp(lo, hi, r()));

const SLA: Record<string, [number, number]> = { L: [9, 14], M: [4, 8], H: [1, 3] };
const COST: Record<string, [number, number]> = { L: [0.002, 0.02], M: [0.01, 0.05], H: [0.04, 0.15] };
const DAYS: Record<string, [number, number]> = { L: [0, 6], M: [2, 12], H: [5, 30] };

const ROOT_CAUSES = ['Design', 'Vendor / supply', 'Workmanship / quality', 'Site conditions', 'Resource / labour', 'Coordination / interface', 'Regulatory / permit', 'Client / scope', 'Weather', 'Other'];

function rootCauseFor(category: string, r: () => number): string {
  const c = category.toLowerCase();
  if (/permit|regulat|consent|licen/.test(c)) return 'Regulatory / permit';
  if (/vendor|supply|supplier|equipment|delivery|procure|logistic/.test(c)) return 'Vendor / supply';
  if (/labou?r|staff|resource|crew|manpower|attrition/.test(c)) return 'Resource / labour';
  if (/weld|quality|workmanship|defect|rework|ndt|inspection/.test(c)) return 'Workmanship / quality';
  if (/design|engineering|drawing|spec/.test(c)) return 'Design';
  if (/weather|wind|storm|rain|snow|ice|climate/.test(c)) return 'Weather';
  if (/site|ground|geotech|soil|excavat|access/.test(c)) return 'Site conditions';
  if (/interface|coordinat|tie-?in|handover|sequenc/.test(c)) return 'Coordination / interface';
  if (/client|scope|owner|change/.test(c)) return 'Client / scope';
  return pick(r, ROOT_CAUSES);
}

async function main() {
  const force = process.argv.includes('--force');
  log.header('Enrich issue log (SLA · cost/schedule impact · escalation · root cause) — migration 0026');
  const db = getServiceClient();

  const { data: projects, error: pErr } = await db.from('projects').select('id, contingency, approved_budget_current');
  if (pErr) throw pErr;
  const contMap = new Map(projects!.map((p) => [p.id, Number(p.contingency) || Number(p.approved_budget_current) * 0.05 || 250000]));

  const { data: issues, error } = await db.from('issues').select('id, project_id, severity, status, category, owner, root_cause');
  if (error) throw error;
  log.info(`${issues!.length} issues across ${projects!.length} projects.`);

  let updated = 0;
  const batches: PromiseLike<unknown>[] = [];
  for (const issue of issues!) {
    if (issue.root_cause && !force) continue;
    const r = rng(issue.id as string);
    const S = String(issue.severity ?? 'M').toUpperCase().charAt(0);
    const sev = S === 'L' || S === 'H' ? S : 'M';
    const status = String(issue.status ?? '').toLowerCase();
    const isOpen = status === 'open' || status === 'in progress';
    const contingency = contMap.get(issue.project_id) ?? 250000;

    const sla_weeks = ri(r, SLA[sev][0], SLA[sev][1]);
    const cost_impact_usd = Math.round(contingency * lerp(COST[sev][0], COST[sev][1], r()));
    const schedule_impact_days = ri(r, DAYS[sev][0], DAYS[sev][1]);
    const escalated = isOpen && sev === 'H' && r() < 0.3;
    const root_cause = rootCauseFor(String(issue.category ?? ''), r);
    const recurrence = r() < 0.18 ? 'Recurring' : 'First occurrence';

    batches.push(db.from('issues').update({ sla_weeks, cost_impact_usd, schedule_impact_days, escalated, root_cause, recurrence }).eq('id', issue.id));
    updated++;
    if (batches.length >= 25) await Promise.all(batches.splice(0));
  }
  if (batches.length) await Promise.all(batches);
  log.success(`Enriched ${updated} issues (SLA · impact · escalation · root cause).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
