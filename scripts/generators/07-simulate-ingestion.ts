/**
 * Simulate SAP PS ingestion — Phase 0/1 of the Integration & Build Roadmap.
 *
 * Pure data, NO LLM. For each SEEDED project (created_via is null) it:
 *   1. Re-tags the project as synced from SAP PS (source_system='SAP_PS',
 *      external_id=code, last_synced_at=now) — so the app tells the
 *      integration story instead of looking self-authored.
 *   2. Populates a realistic WBS into work_packages (5 phases + leaf work
 *      packages), with budget (BAC) allocated from the project's approved
 *      budget, tagged source_system='SAP_PS', is_app_native=false.
 *
 * App-created projects (created_via='intake_form') are left as source_system
 * 'APP' and are NOT given a WBS here (they have no SAP source).
 *
 * Requires migration 0017. Idempotent: skips projects that already have work
 * packages unless --force (which deletes + rebuilds them).
 *
 * Run from pmo-llm-demo/:
 *   ./node_modules/.bin/tsx scripts/generators/07-simulate-ingestion.ts          # fill missing
 *   ./node_modules/.bin/tsx scripts/generators/07-simulate-ingestion.ts --force  # rebuild all
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

type Segment = 'renewables' | 'water' | 'industrial' | 'power';

interface ProjectRow {
  id: string;
  code: string;
  segment: Segment;
  approved_budget_current: number | string;
  created_via: string | null;
}

interface WpDef {
  code: string;
  parent: string | null;
  name: string;
  role: string | null;
  weight: number; // share of total BAC (leaves only sum to 1.0)
  billing?: boolean;
}

// Segment-specific name for the major-equipment work package.
const MAJOR_EQUIPMENT: Record<Segment, string> = {
  renewables: 'Major equipment — turbines / PV / inverters',
  power: 'Major equipment — CTG / STG / HRSG / generator',
  water: 'Major equipment — membranes & process units',
  industrial: 'Major equipment — long-lead & exotic alloys',
};

function wbsTemplate(segment: Segment): WpDef[] {
  const eq = MAJOR_EQUIPMENT[segment];
  // Phases (parents, billing elements) carry no leaf weight; leaves sum to 1.0.
  return [
    { code: '1.1', parent: null, name: 'Development & permitting', role: 'program_manager', weight: 0, billing: true },
    { code: '1.1.1', parent: '1.1', name: 'Permits & approvals', role: 'program_manager', weight: 0.04 },
    { code: '1.1.2', parent: '1.1', name: 'Interconnection & land / site', role: 'engineering_manager', weight: 0.03 },

    { code: '1.2', parent: null, name: 'Engineering', role: 'engineering_manager', weight: 0, billing: true },
    { code: '1.2.1', parent: '1.2', name: 'Detailed engineering & design', role: 'engineering_manager', weight: 0.10 },

    { code: '1.3', parent: null, name: 'Procurement', role: 'procurement', weight: 0, billing: true },
    { code: '1.3.1', parent: '1.3', name: eq, role: 'procurement', weight: 0.32 },
    { code: '1.3.2', parent: '1.3', name: 'Balance of plant & bulks', role: 'procurement', weight: 0.13 },

    { code: '1.4', parent: null, name: 'Construction', role: 'construction_manager', weight: 0, billing: true },
    { code: '1.4.1', parent: '1.4', name: 'Civil & foundations', role: 'construction_manager', weight: 0.14 },
    { code: '1.4.2', parent: '1.4', name: 'Mechanical, electrical & install', role: 'construction_manager', weight: 0.18 },

    { code: '1.5', parent: null, name: 'Commissioning & start-up', role: 'project_controls', weight: 0, billing: true },
    { code: '1.5.1', parent: '1.5', name: 'Testing, commissioning & handover', role: 'project_controls', weight: 0.06 },
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate SAP PS ingestion (work_packages + provenance)');
  if (force) log.warn('FORCE — rebuilding work packages');

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, code, segment, approved_budget_current, created_via')
    .order('code', { ascending: true });
  if (error) {
    log.error(`Could not load projects: ${error.message}`);
    process.exit(1);
  }
  const projects = (data ?? []) as ProjectRow[];
  const seeded = projects.filter((p) => !p.created_via); // null created_via = seeded
  log.info(`${projects.length} projects loaded; ${seeded.length} seeded (will be tagged SAP_PS)`);

  const nowIso = new Date().toISOString();
  let taggedCount = 0;
  let wpCount = 0;
  let skipped = 0;

  for (const p of seeded) {
    // 1. Re-tag the project as synced from SAP PS.
    await supabase
      .from('projects')
      .update({ source_system: 'SAP_PS', external_id: p.code, last_synced_at: nowIso })
      .eq('id', p.id);
    taggedCount++;

    // 2. Work packages — skip if present unless --force.
    const { data: existing } = await supabase.from('work_packages').select('id').eq('project_id', p.id).limit(1);
    if (existing && existing.length > 0) {
      if (!force) {
        skipped++;
        continue;
      }
      await supabase.from('work_packages').delete().eq('project_id', p.id);
    }

    const bac = Number(p.approved_budget_current) || 0;
    const tmpl = wbsTemplate(p.segment);
    // Phase BAC = sum of its leaves.
    const phaseTotals = new Map<string, number>();
    for (const w of tmpl) {
      if (w.parent) phaseTotals.set(w.parent, (phaseTotals.get(w.parent) ?? 0) + w.weight * bac);
    }
    const rows = tmpl.map((w) => ({
      project_id: p.id,
      wbs_code: w.code,
      parent_wbs_code: w.parent,
      name: w.name,
      responsible_role_type: w.role,
      is_billing_element: w.billing === true,
      budget_bac: round2(w.parent ? w.weight * bac : (phaseTotals.get(w.code) ?? 0)),
      source_system: 'SAP_PS',
      external_id: `${p.code}-${w.code}`,
      synced_at: nowIso,
      is_app_native: false,
    }));
    const { error: insErr } = await supabase.from('work_packages').insert(rows);
    if (insErr) {
      log.error(`${p.code}: ${insErr.message}`);
      continue;
    }
    wpCount += rows.length;
    if (taggedCount % 20 === 0) log.info(`… ${taggedCount} projects processed`);
  }

  section('Summary');
  log.success(`${taggedCount} seeded projects tagged SAP_PS; ${wpCount} work packages inserted; ${skipped} projects skipped (already had WBS)`);
  log.info('App-created (intake) projects left as source_system=APP with no WBS.');
}

main().catch((e) => {
  log.error(String(e));
  process.exit(1);
});
