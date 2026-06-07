/**
 * Enrich the risk register — quantitative EMV, inherent→residual, threat/
 * opportunity + response strategy, and a score trend. Pure data, NO LLM.
 *
 * For every risk it derives, deterministically from the risk id (stable across
 * re-runs), values coherent with the existing qualitative P/I and status:
 *   - probability_pct      from inherent probability band (L/M/H)
 *   - cost_impact_usd       scaled to the project's contingency × impact band
 *   - schedule_impact_days  from impact band
 *   - risk_type             ~12% opportunities, rest threats
 *   - response_strategy     PMBOK strategy by type + severity
 *   - residual_*            post-mitigation position driven by status
 *   - score_trend           inherent→residual series shaped by status
 * (emv_usd / residual_emv_usd are generated columns — never written here.)
 *
 * Requires migration 0024. Idempotent.
 *   ./node_modules/.bin/tsx scripts/generators/14-enrich-risks.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log } from '../lib/log';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// Deterministic [0,1) stream seeded by a string.
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const num = (l: string) => (l === 'L' ? 1 : l === 'M' ? 2 : 3);
const lvl = (n: number): 'L' | 'M' | 'H' => (n <= 1 ? 'L' : n === 2 ? 'M' : 'H');

const PROB_BAND: Record<string, [number, number]> = { L: [8, 22], M: [33, 55], H: [64, 86] };
const COST_BAND: Record<string, [number, number]> = { L: [0.03, 0.10], M: [0.12, 0.30], H: [0.35, 0.70] };
const DAYS_BAND: Record<string, [number, number]> = { L: [3, 12], M: [15, 40], H: [45, 110] };

async function main() {
  const force = process.argv.includes('--force');
  log.header('Enrich risk register (EMV · residual · type/strategy · trend) — migration 0024');
  const db = getServiceClient();

  const { data: projects, error: pErr } = await db.from('projects').select('id, contingency, approved_budget_current');
  if (pErr) throw pErr;
  const contMap = new Map(projects!.map((p) => [p.id, Number(p.contingency) || Number(p.approved_budget_current) * 0.05 || 250000]));

  const { data: risks, error: rErr } = await db
    .from('risks')
    .select('id, project_id, risk_id, probability, impact, score, status, response_strategy');
  if (rErr) throw rErr;
  log.info(`${risks!.length} risks across ${projects!.length} projects.`);

  let updated = 0;
  const batches: PromiseLike<unknown>[] = [];
  for (const risk of risks!) {
    if (risk.response_strategy && !force) continue; // already enriched
    const r = rng(risk.id as string);
    const P = String(risk.probability ?? 'M').toUpperCase().charAt(0);
    const I = String(risk.impact ?? 'M').toUpperCase().charAt(0);
    const status = String(risk.status ?? '').toLowerCase();
    const contingency = contMap.get(risk.project_id) ?? 250000;

    const probability_pct = Math.round(lerp(PROB_BAND[P]?.[0] ?? 40, PROB_BAND[P]?.[1] ?? 55, r()));
    const cost_impact_usd = Math.round(contingency * lerp(COST_BAND[I]?.[0] ?? 0.12, COST_BAND[I]?.[1] ?? 0.30, r()));
    const schedule_impact_days = Math.round(lerp(DAYS_BAND[I]?.[0] ?? 15, DAYS_BAND[I]?.[1] ?? 40, r()));

    const isOpp = r() < 0.12;
    const risk_type = isOpp ? 'opportunity' : 'threat';
    const sevHigh = num(P) * num(I) >= 6;
    const response_strategy = isOpp
      ? pick(r, ['Exploit', 'Enhance', 'Share', 'Accept'])
      : (status.includes('realised')
          ? 'Accept'
          : sevHigh
            ? pick(r, ['Mitigate', 'Mitigate', 'Transfer', 'Avoid', 'Escalate'])
            : pick(r, ['Mitigate', 'Accept', 'Transfer']));

    // Residual position by status (mitigation reduces probability more than impact).
    let probDrop = 0, residMul = 1;
    if (status.includes('not materialised')) { probDrop = 2; residMul = 0.15; }
    else if (status.includes('mitigated')) { probDrop = r() < 0.5 ? 2 : 1; residMul = lerp(0.20, 0.40, r()); }
    else if (status.includes('active')) { probDrop = 1; residMul = lerp(0.45, 0.65, r()); }
    else if (status.includes('realised')) { probDrop = 0; residMul = 1; }
    else { probDrop = r() < 0.3 ? 1 : 0; residMul = lerp(0.80, 1.0, r()); } // Open

    const residProbN = Math.max(1, num(P) - probDrop);
    const residImpN = num(I) > 2 && r() < 0.3 ? num(I) - 1 : num(I); // impact occasionally eases for H
    const residual_probability = lvl(residProbN);
    const residual_impact = lvl(residImpN);
    const residual_score = residProbN * residImpN;
    const residual_probability_pct = Math.round(Math.min(probability_pct, probability_pct * residMul));

    // Trend: inherent_score → residual_score across 6 reporting points.
    const inherentScore = Number(risk.score) || num(P) * num(I);
    const pts = 6;
    const score_trend = Array.from({ length: pts }, (_, k) => {
      const t = k / (pts - 1);
      let s = lerp(inherentScore, residual_score, status.includes('open') ? t * 0.3 : t);
      if (status.includes('realised') && k === pts - 2) s = Math.min(9, inherentScore + 1); // spike before realisation
      return { w: k + 1, s: Math.max(1, Math.round(s)) };
    });

    batches.push(
      db.from('risks').update({
        probability_pct, cost_impact_usd, schedule_impact_days,
        risk_type, response_strategy,
        residual_probability, residual_impact, residual_score, residual_probability_pct,
        score_trend,
      }).eq('id', risk.id),
    );
    updated++;
    if (batches.length >= 25) { await Promise.all(batches.splice(0)); }
  }
  if (batches.length) await Promise.all(batches);
  log.success(`Enriched ${updated} risks (EMV, residual, type/strategy, trend).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
