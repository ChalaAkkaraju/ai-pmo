/**
 * Simulate cross-agent action items — the assign->respond loop. Pure data, NO LLM.
 *
 * Sources realistic actions from each ACTIVE project's existing risks and issues:
 * a Risk Analyst raises a mitigation action assigned to the risk owner; the Issue
 * Logger raises a resolution action assigned to the issue owner. A share are
 * acknowledged / in progress / done, and the worked ones carry a response so the
 * "Responded" KPI and the Cross-agent actions analytics populate. Plus a few
 * portfolio-level (project_id null) cross-cutting actions.
 *
 * Requires migrations 0009 + 0010 and seeded risks/issues (gen 02/03).
 * Idempotent: skips projects that already have action items unless --force.
 *   ./node_modules/.bin/tsx scripts/generators/20-simulate-action-items.ts
 *   ./node_modules/.bin/tsx scripts/generators/20-simulate-action-items.ts --force
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';
import { log, section } from '../lib/log';

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

// Map a free-text risk/issue owner label to a canonical role_type.
const OWNER_TO_ROLE: Record<string, string> = {
  'PM': 'pm',
  'Procurement Lead': 'procurement',
  'Construction Manager': 'construction_manager',
  'Commercial Manager': 'commercial',
  'Engineering Lead': 'engineering_manager',
  'Risk Analyst': 'risk',
  'Site Engineer': 'construction_manager',
  'QA/QC Lead': 'engineering_manager',
};
const ROLE_TYPES = new Set(['pm', 'procurement', 'risk', 'sponsor', 'commercial', 'project_controls', 'program_manager', 'engineering_manager', 'construction_manager', 'hse_manager']);
function toRole(owner: string | null | undefined): string {
  if (!owner) return 'pm';
  if (ROLE_TYPES.has(owner)) return owner;
  return OWNER_TO_ROLE[owner.trim()] ?? 'pm';
}
function firstSentence(s: string, max = 140): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  const cut = t.split(/(?<=[.!?])\s/)[0] ?? t;
  return cut.length > max ? cut.slice(0, max - 1).trimEnd() + '…' : cut;
}

// status mix (weighted) and which statuses carry a response.
const STATUS_BAG = ['Open', 'Open', 'Open', 'Open', 'Acknowledged', 'In progress', 'In progress', 'Done', 'Done'];
const RESPONDED = new Set(['Acknowledged', 'In progress', 'Done']);

interface RiskRow { id: string; risk_id: string; category: string; description: string; impact: string; response: string; owner: string; status: string; score: number; }
interface IssueRow { id: string; issue_id: string; category: string; description: string; severity: string; owner: string | null; status: string; }

async function main() {
  const force = process.argv.includes('--force');
  log.header('Simulate cross-agent action items (assign->respond loop) — migrations 0009 + 0010');
  const db = getServiceClient();

  const { data: projects, error: pErr } = await db.from('projects').select('id, code, current_week, status').eq('status', 'Active').order('code');
  if (pErr) throw pErr;

  let total = 0, responded = 0, processed = 0, skipped = 0;
  for (const p of (projects ?? []) as Array<{ id: string; code: string; current_week: number | string; status: string }>) {
    const existing = await db.from('action_items').select('id').eq('project_id', p.id).limit(1);
    if ((existing.data?.length ?? 0) > 0) {
      if (!force) { skipped++; continue; }
      await db.from('action_items').delete().eq('project_id', p.id);
    }

    const { data: risks } = await db.from('risks')
      .select('id, risk_id, category, description, impact, response, owner, status, score')
      .eq('project_id', p.id).order('score', { ascending: false }).limit(8);
    const { data: issues } = await db.from('issues')
      .select('id, issue_id, category, description, severity, owner, status')
      .eq('project_id', p.id).in('status', ['Open', 'In progress']).limit(6);

    const currentWeek = Number(p.current_week) || 40;
    const rows: Record<string, unknown>[] = [];

    // From the top open risks -> mitigation actions (raised by the Risk Analyst).
    const openRisks = (risks ?? []).filter((r: RiskRow) => !['Closed', 'Retired', 'Realised'].includes(r.status)).slice(0, 3) as RiskRow[];
    openRisks.forEach((rk, i) => {
      const r = rng(`${p.id}:risk:${rk.id}:ai`);
      const status = STATUS_BAG[Math.floor(r() * STATUS_BAG.length)];
      const isResp = RESPONDED.has(status);
      const dueWk = Math.min(currentWeek + 2 + Math.floor(r() * 16), currentWeek + 20);
      rows.push({
        project_id: p.id, source_type: 'risk', source_id: rk.id, source_ref: rk.risk_id,
        description: `Progress agreed mitigation for ${rk.risk_id} (${rk.category}): ${firstSentence(rk.response || rk.description)}`,
        assigned_to_role_type: toRole(rk.owner), raised_by_role_type: 'risk', raised_by_agent_type: 'risk_analyst',
        status, urgency: rk.impact, due_week: dueWk,
        assignment_flagged: rk.impact === 'H' && status === 'Open',
        response_md: isResp ? `**Update:** Mitigation ${status === 'Done' ? 'complete' : 'underway'} — owner engaged, ${status === 'Done' ? 'residual exposure closed out' : `tracking to week ${dueWk}`}.` : null,
        responded_by_role_type: isResp ? toRole(rk.owner) : null,
        responded_at: isResp ? new Date(Date.now() - Math.floor(r() * 6) * 86400000).toISOString() : null,
      });
      if (isResp) responded++;
    });

    // From open issues -> resolution actions (raised by the Issue Logger).
    const openIssues = (issues ?? []).slice(0, 2) as IssueRow[];
    openIssues.forEach((iss) => {
      const r = rng(`${p.id}:issue:${iss.id}:ai`);
      const status = STATUS_BAG[Math.floor(r() * STATUS_BAG.length)];
      const isResp = RESPONDED.has(status);
      const dueWk = Math.min(currentWeek + 1 + Math.floor(r() * 8), currentWeek + 12);
      rows.push({
        project_id: p.id, source_type: 'issue', source_id: iss.id, source_ref: iss.issue_id,
        description: `Resolve ${iss.issue_id} (${iss.category}): ${firstSentence(iss.description)}`,
        assigned_to_role_type: toRole(iss.owner), raised_by_role_type: 'project_controls', raised_by_agent_type: 'issue_logger',
        status, urgency: iss.severity, due_week: dueWk,
        assignment_flagged: iss.severity === 'H' && status === 'Open',
        response_md: isResp ? `**Update:** ${status === 'Done' ? 'Issue resolved and verified.' : `Corrective action in progress; closure expected week ${dueWk}.`}` : null,
        responded_by_role_type: isResp ? toRole(iss.owner) : null,
        responded_at: isResp ? new Date(Date.now() - Math.floor(r() * 4) * 86400000).toISOString() : null,
      });
      if (isResp) responded++;
    });

    if (rows.length) {
      const { error } = await db.from('action_items').insert(rows);
      if (error) { log.error(`${p.code}: ${error.message}`); continue; }
      total += rows.length;
    }
    processed++;
    if (processed % 20 === 0) log.info(`… ${processed} projects`);
  }

  // A few portfolio-level cross-cutting actions (project_id null).
  const haverportfolio = await db.from('action_items').select('id').is('project_id', null).limit(1);
  if (force || (haverportfolio.data?.length ?? 0) === 0) {
    if (force) await db.from('action_items').delete().is('project_id', null);
    const portfolio: Record<string, unknown>[] = [
      { project_id: null, source_type: 'risk', source_ref: 'PORTFOLIO-P1', description: 'Sole-source critical equipment exposure across 3 projects — convene category strategy review.', assigned_to_role_type: 'procurement', raised_by_role_type: 'risk', raised_by_agent_type: 'portfolio_risk_reviewer', status: 'In progress', urgency: 'H', due_week: 6, assignment_flagged: true, response_md: '**Update:** Category review scheduled; dual-source options under evaluation.', responded_by_role_type: 'procurement', responded_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { project_id: null, source_type: 'risk', source_ref: 'PORTFOLIO-P2', description: 'Grid-connection schedule risk clustering in renewables — align interface milestones.', assigned_to_role_type: 'program_manager', raised_by_role_type: 'risk', raised_by_agent_type: 'portfolio_risk_reviewer', status: 'Open', urgency: 'H', due_week: 8, assignment_flagged: true, response_md: null, responded_by_role_type: null, responded_at: null },
      { project_id: null, source_type: 'issue', source_ref: 'PORTFOLIO-P3', description: 'Recurring QA/QC nonconformances on civil works — standardise inspection checklist.', assigned_to_role_type: 'construction_manager', raised_by_role_type: 'project_controls', raised_by_agent_type: 'issue_logger', status: 'Acknowledged', urgency: 'M', due_week: 10, assignment_flagged: false, response_md: '**Update:** Standard checklist drafted; rolling out to active sites.', responded_by_role_type: 'construction_manager', responded_at: new Date(Date.now() - 1 * 86400000).toISOString() },
      { project_id: null, source_type: 'risk', source_ref: 'PORTFOLIO-P4', description: 'Commercial exposure on liquidated damages in 2 power projects — review contingency adequacy.', assigned_to_role_type: 'commercial', raised_by_role_type: 'risk', raised_by_agent_type: 'portfolio_risk_reviewer', status: 'Open', urgency: 'M', due_week: 12, assignment_flagged: false, response_md: null, responded_by_role_type: null, responded_at: null },
    ];
    const { error } = await db.from('action_items').insert(portfolio);
    if (!error) { total += portfolio.length; responded += 2; }
  }

  section('Summary');
  log.success(`${total} action items across ${processed} active projects (${responded} responded); ${skipped} skipped (already had actions).`);
}

main().catch((e) => { log.error(String((e as Error).stack ?? e)); process.exit(1); });
