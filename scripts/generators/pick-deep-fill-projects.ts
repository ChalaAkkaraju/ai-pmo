/**
 * Picks 10 projects for the "deep planning fill" pass.
 *
 *   5 from the Hot List (top by composite score = CPI deviation + SPI deviation
 *     + 2×open H issues + realised risks), Active or SC only
 *   5 more for variety: one per segment + spread across lifecycle stages,
 *     avoiding any already in the Hot List
 *
 * Prints the 10 project codes (one per line, ready to paste into the bulk-fill
 * script) plus a human-readable summary table.
 *
 * Run:
 *   ./node_modules/.bin/tsx scripts/generators/pick-deep-fill-projects.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

interface Project {
  id: string;
  code: string;
  name: string;
  segment: string;
  status: string;
  current_week: number;
  contract_value_current: number;
}

interface HotItem extends Project {
  cpi: number;
  spi: number;
  open_h_issues: number;
  realised_risks: number;
  score: number;
}

async function main() {
  log.header('Pick 10 projects for deep planning fill');
  const supabase = getServiceClient();

  const [projectsRes, risksRes, issuesRes, varianceRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, code, name, segment, status, current_week, contract_value_current')
      .order('code', { ascending: true }),
    supabase.from('risks').select('project_id, status'),
    supabase.from('issues').select('project_id, severity, status'),
    supabase.from('variance_reports').select('project_id, report_week, cpi, spi'),
  ]);

  const projects = (projectsRes.data ?? []) as Project[];
  const risks = (risksRes.data ?? []) as Array<{ project_id: string; status: string }>;
  const issues = (issuesRes.data ?? []) as Array<{ project_id: string; severity: string; status: string }>;
  const variance = (varianceRes.data ?? []) as Array<{ project_id: string; report_week: number; cpi: number | string; spi: number | string }>;

  log.info(`Loaded ${projects.length} projects, ${risks.length} risks, ${issues.length} issues, ${variance.length} variance reports`);

  // Latest variance per project
  const latestVariance = new Map<string, { cpi: number; spi: number }>();
  const sorted = [...variance].sort((a, b) => b.report_week - a.report_week);
  for (const v of sorted) {
    if (!latestVariance.has(v.project_id)) {
      latestVariance.set(v.project_id, { cpi: Number(v.cpi), spi: Number(v.spi) });
    }
  }

  // Open H issues + realised risks per project
  const openHByProject = new Map<string, number>();
  for (const i of issues) {
    if (i.severity === 'H' && (i.status === 'Open' || i.status === 'In progress')) {
      openHByProject.set(i.project_id, (openHByProject.get(i.project_id) ?? 0) + 1);
    }
  }
  const realisedByProject = new Map<string, number>();
  for (const r of risks) {
    if (String(r.status).toLowerCase().startsWith('realised')) {
      realisedByProject.set(r.project_id, (realisedByProject.get(r.project_id) ?? 0) + 1);
    }
  }

  // Hot List — composite score, Active or SC only
  const hotAll: HotItem[] = projects
    .filter((p) => p.status === 'Active' || p.status === 'SC')
    .map((p) => {
      const v = latestVariance.get(p.id);
      const cpi = v?.cpi ?? 1;
      const spi = v?.spi ?? 1;
      const cpiPenalty = Math.max(0, 1 - cpi) * 10;
      const spiPenalty = Math.max(0, 1 - spi) * 10;
      const openH = openHByProject.get(p.id) ?? 0;
      const realised = realisedByProject.get(p.id) ?? 0;
      const score = cpiPenalty + spiPenalty + openH * 2 + realised * 1;
      return { ...p, cpi, spi, open_h_issues: openH, realised_risks: realised, score: Number(score.toFixed(1)) };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  const hotTop5 = hotAll.slice(0, 5);
  const hotIds = new Set(hotTop5.map((h) => h.id));

  // 5 more for variety: one per segment + spread across lifecycle stages
  // Avoid: anchors (Mariposa, Carmel, and the 2 originals), Hot List picks
  const ANCHOR_CODES = new Set(['NW-2401', 'NW-REN-2603', 'NW-WTR-2510', 'NW-IND-2511']);
  const candidates = projects.filter((p) => !ANCHOR_CODES.has(p.code) && !hotIds.has(p.id));

  const variety: Project[] = [];
  const segmentsSeen = new Set<string>();
  const statusesSeen = new Map<string, number>();

  // Pass 1: pick one Active per segment we haven't covered (4 segments × Active)
  for (const seg of ['renewables', 'water', 'industrial', 'power']) {
    if (variety.length >= 4) break;
    const pick = candidates.find(
      (p) => p.segment === seg && p.status === 'Active' && !segmentsSeen.has(seg),
    );
    if (pick) {
      variety.push(pick);
      segmentsSeen.add(seg);
      statusesSeen.set('Active', (statusesSeen.get('Active') ?? 0) + 1);
    }
  }

  // Pass 2: add one Closed and one SC for lifecycle variety (positions 5)
  if (variety.length < 5) {
    const closedPick = candidates.find(
      (p) => p.status === 'Closed' && !variety.some((v) => v.id === p.id),
    );
    if (closedPick) variety.push(closedPick);
  }
  // If we still need one (e.g. Closed not found), add an SC
  if (variety.length < 5) {
    const scPick = candidates.find(
      (p) => p.status === 'SC' && !variety.some((v) => v.id === p.id),
    );
    if (scPick) variety.push(scPick);
  }
  // Final fallback — any project we haven't picked yet
  if (variety.length < 5) {
    const fallback = candidates.find((p) => !variety.some((v) => v.id === p.id));
    if (fallback) variety.push(fallback);
  }

  // Print summary
  section('Hot List — top 5 by composite score (CPI/SPI deviation + open H + realised risks)');
  console.log(
    `${'#'.padStart(2)}  ${'Code'.padEnd(13)} ${'Segment'.padEnd(11)} ${'Stat'.padEnd(7)} ${'Wk'.padEnd(4)} ${'CPI'.padEnd(5)} ${'SPI'.padEnd(5)} ${'OpenH'.padEnd(6)} ${'Real'.padEnd(5)} ${'Score'.padEnd(6)} Name`,
  );
  hotTop5.forEach((h, i) => {
    console.log(
      `${String(i + 1).padStart(2)}. ${h.code.padEnd(13)} ${h.segment.padEnd(11)} ${h.status.padEnd(7)} ${String(h.current_week).padEnd(4)} ${h.cpi.toFixed(2).padEnd(5)} ${h.spi.toFixed(2).padEnd(5)} ${String(h.open_h_issues).padEnd(6)} ${String(h.realised_risks).padEnd(5)} ${String(h.score).padEnd(6)} ${h.name}`,
    );
  });

  section('Variety picks — one per segment + lifecycle spread');
  console.log(
    `${'#'.padStart(2)}  ${'Code'.padEnd(13)} ${'Segment'.padEnd(11)} ${'Stat'.padEnd(7)} ${'Wk'.padEnd(4)} Name`,
  );
  variety.forEach((p, i) => {
    console.log(
      `${String(i + 6).padStart(2)}. ${p.code.padEnd(13)} ${p.segment.padEnd(11)} ${p.status.padEnd(7)} ${String(p.current_week).padEnd(4)} ${p.name}`,
    );
  });

  section('Final 10 picks (paste these codes into the bulk-fill script)');
  const allCodes = [...hotTop5.map((h) => h.code), ...variety.map((p) => p.code)];
  console.log(allCodes.join(','));
  console.log('');
  console.log('Or as a list:');
  for (const c of allCodes) console.log(`  ${c}`);

  log.success(`\nTotal: ${allCodes.length} projects ready for deep fill (5 agents × 10 projects = 50 calls)`);
}

main().catch((err) => {
  log.error(`Picker failed: ${(err as Error).stack ?? err}`);
  process.exit(1);
});
