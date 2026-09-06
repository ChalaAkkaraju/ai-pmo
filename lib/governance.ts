/**
 * Governance engine — delegation of authority, decision records and the
 * effects of an approved decision (migration 0046).
 *
 * Model:
 *   • The authority matrix maps (decision kind × amount band × funding source
 *     × pre/post-commit) to the body that must decide and the concurrences
 *     that must be recorded first.
 *   • A decision record is proposed (by the PMO / PM / sponsor), collects
 *     concurrences, and is decided by a member of the required body. Only
 *     then does the operational effect happen (sanction event, gate decision,
 *     allocation, change-order approval), linked back to the record.
 *   • If the actor is already a member of the required body and every
 *     concurrence is in place, `routeOrApply` applies immediately and writes
 *     an already-approved record — one click, full audit trail.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorityRule, DecisionBody, DecisionBodyMember, DecisionKind, DecisionRecord, FundingSource, Project, Role, StageTemplate } from './types';
import { commitStage, isCommitted, nextStage, stageAt } from './stage-gates';

export interface Governance {
  bodies: DecisionBody[];
  members: DecisionBodyMember[];
  matrix: AuthorityRule[];
}

export async function loadGovernance(sb: SupabaseClient, projectType: string): Promise<Governance> {
  const [b, m, x] = await Promise.all([
    sb.from('decision_bodies').select('*').eq('project_type', projectType),
    sb.from('decision_body_members').select('*'),
    sb.from('authority_matrix').select('*').eq('project_type', projectType).order('min_amount'),
  ]);
  const bodies = (b.data ?? []) as DecisionBody[];
  const ids = new Set(bodies.map((x) => x.id));
  return { bodies, members: ((m.data ?? []) as DecisionBodyMember[]).filter((r) => ids.has(r.body_id)), matrix: (x.data ?? []) as AuthorityRule[] };
}

/** Pick the matrix row for a decision. */
export function resolveRule(g: Governance, kind: DecisionKind, amount: number, opts: { funding_source?: FundingSource | null; post_commit?: boolean | null } = {}): AuthorityRule | null {
  const a = Number(amount) || 0;
  const rows = g.matrix.filter((r) => r.decision_kind === kind)
    .filter((r) => (opts.funding_source ? r.funding_source === opts.funding_source : r.funding_source == null))
    .filter((r) => r.post_commit == null || opts.post_commit == null || r.post_commit === opts.post_commit)
    .filter((r) => a >= Number(r.min_amount) && (r.max_amount == null || a < Number(r.max_amount)));
  // Prefer the most specific (post_commit stated, funding stated)
  rows.sort((p, q) => Number(q.post_commit != null) - Number(p.post_commit != null));
  return rows[0] ?? null;
}

/** bucket_owner:* → bucket_owner:<bucket>. */
export function resolveBodyKey(key: string, bucket: string | null | undefined): string {
  return key === 'bucket_owner:*' ? `bucket_owner:${bucket ?? 'unassigned'}` : key;
}

export function bodyByKey(g: Governance, key: string): DecisionBody | null {
  return g.bodies.find((b) => b.key === key) ?? null;
}

export function bodyName(g: Governance, key: string): string {
  return bodyByKey(g, key)?.name ?? key.replace(/_/g, ' ').replace(/:/, ' — ');
}

/** Is this role a member of the body (explicit membership or role-type body)? */
/**
 * Voting membership: only voting members can decide or concur. A non-voting
 * seat (e.g. the PMO attending the board as secretary) sees the queue but has
 * no authority — best practice keeps the proposer and the decider apart.
 */
export function isMember(g: Governance, role: Pick<Role, 'id' | 'role_type'>, bodyKey: string): boolean {
  const body = bodyByKey(g, bodyKey);
  if (!body) return false;
  if (body.member_role_type && body.member_role_type === role.role_type) return true;
  return g.members.some((m) => m.body_id === body.id && m.role_id === role.id && m.is_voting !== false);
}

/** Bodies this role can decide or concur for (voting seats only). */
export function bodiesFor(g: Governance, role: Pick<Role, 'id' | 'role_type'>): string[] {
  return g.bodies.filter((b) => isMember(g, role, b.key)).map((b) => b.key);
}

export function concurrencesSatisfied(rec: Pick<DecisionRecord, 'required_concurrences' | 'concurrences'>): { ok: boolean; missing: string[]; objections: string[] } {
  const missing: string[] = [], objections: string[] = [];
  for (const k of rec.required_concurrences ?? []) {
    const latest = [...(rec.concurrences ?? [])].filter((c) => c.body_key === k).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
    if (!latest) missing.push(k);
    else if (latest.outcome === 'object') objections.push(k);
  }
  return { ok: missing.length === 0 && objections.length === 0, missing, objections };
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export interface ProposalInput {
  project_type: 'it';
  kind: DecisionKind;
  project?: Pick<Project, 'id' | 'code' | 'portfolio_bucket'> | null;
  bucket?: string | null;
  fiscal_year?: number | null;
  amount?: number | null;
  title: string;
  proposal: Record<string, unknown>;
  funding_source?: FundingSource | null;
  post_commit?: boolean | null;
}

export async function createProposal(sb: SupabaseClient, g: Governance, actor: Role, input: ProposalInput): Promise<{ record: DecisionRecord | null; error?: string; rule?: AuthorityRule | null }> {
  const rule = resolveRule(g, input.kind, Number(input.amount ?? 0), { funding_source: input.funding_source ?? null, post_commit: input.post_commit ?? null });
  if (!rule) return { record: null, error: `No authority-matrix rule for ${input.kind} at ${input.amount ?? 0}` };
  const bodyKey = resolveBodyKey(rule.required_body_key, input.bucket ?? input.project?.portfolio_bucket ?? null);
  const { data, error } = await sb.from('decision_records').insert({
    project_type: input.project_type, decision_kind: input.kind, project_id: input.project?.id ?? null, fiscal_year: input.fiscal_year ?? null,
    amount: input.amount ?? null, title: input.title, proposal: input.proposal,
    proposed_by_role_id: actor.id, proposed_by_name: actor.name,
    required_body_key: bodyKey, required_concurrences: rule.required_concurrences ?? [],
  }).select('*').maybeSingle();
  if (error || !data) return { record: null, error: error?.message ?? 'insert failed', rule };
  return { record: data as DecisionRecord, rule };
}

/**
 * Propose, and if the actor may decide it and nothing is outstanding, decide
 * it at once. Returns the record in its final state plus what happened.
 */
export async function routeOrApply(sb: SupabaseClient, g: Governance, actor: Role, input: ProposalInput, ctx: { attendees?: string[]; conditions?: string | null; minutes?: string | null } = {}): Promise<{ record: DecisionRecord | null; applied: boolean; error?: string; requires?: string }> {
  const created = await createProposal(sb, g, actor, input);
  if (!created.record) return { record: null, applied: false, error: created.error };
  const rec = created.record;
  const conc = concurrencesSatisfied(rec);
  if (isMember(g, actor, rec.required_body_key) && conc.ok) {
    const res = await decide(sb, g, actor, rec, 'approved', ctx);
    return { record: res.record, applied: res.applied, error: res.error };
  }
  return { record: rec, applied: false, requires: rec.required_body_key };
}

export async function concur(sb: SupabaseClient, g: Governance, actor: Role, rec: DecisionRecord, bodyKey: string, outcome: 'concur' | 'object', notes?: string | null): Promise<{ record: DecisionRecord | null; error?: string }> {
  if (!rec.required_concurrences.includes(bodyKey)) return { record: null, error: `${bodyKey} is not a required concurrence on this decision` };
  if (!isMember(g, actor, bodyKey)) return { record: null, error: `Your role is not a member of ${bodyName(g, bodyKey)}` };
  if (rec.status !== 'proposed') return { record: null, error: 'Decision is no longer open' };
  const concurrences = [...(rec.concurrences ?? []), { body_key: bodyKey, outcome, by_name: actor.name, by_role_id: actor.id, at: new Date().toISOString(), notes: notes ?? null }];
  const { data, error } = await sb.from('decision_records').update({ concurrences }).eq('id', rec.id).select('*').maybeSingle();
  if (error) return { record: null, error: error.message };
  return { record: data as DecisionRecord };
}

export async function decide(sb: SupabaseClient, g: Governance, actor: Role, rec: DecisionRecord, outcome: 'approved' | 'rejected' | 'returned', ctx: { attendees?: string[]; conditions?: string | null; minutes?: string | null } = {}): Promise<{ record: DecisionRecord | null; applied: boolean; error?: string }> {
  if (rec.status !== 'proposed') return { record: rec, applied: false, error: 'Decision is no longer open' };
  if (!isMember(g, actor, rec.required_body_key)) return { record: rec, applied: false, error: `Only ${bodyName(g, rec.required_body_key)} can decide this` };
  if (outcome === 'approved') {
    const conc = concurrencesSatisfied(rec);
    if (!conc.ok) return { record: rec, applied: false, error: conc.objections.length ? `Objection recorded by ${conc.objections.map((k) => bodyName(g, k)).join(', ')}` : `Concurrence still required from ${conc.missing.map((k) => bodyName(g, k)).join(', ')}` };
  }
  const body = bodyByKey(g, rec.required_body_key);
  const attendees = ctx.attendees && ctx.attendees.length ? ctx.attendees : [actor.name];
  if (outcome === 'approved' && body && attendees.length < body.quorum) {
    return { record: rec, applied: false, error: `${body.name} needs a quorum of ${body.quorum}; ${attendees.length} attendee(s) recorded` };
  }
  const patch: Record<string, unknown> = {
    status: outcome, decided_body_key: rec.required_body_key, decided_by_role_id: actor.id, decided_by_name: actor.name,
    decided_at: new Date().toISOString(), attendees, conditions: ctx.conditions ?? null, minutes: ctx.minutes ?? null,
  };
  let applied = false;
  // A duplicate open request for the same change order is superseded by whatever was decided here.
  if (rec.decision_kind === 'change_order' && (rec.proposal as { change_order_id?: string } | null)?.change_order_id) {
    await sb.from('decision_records').update({ status: 'withdrawn', decided_at: new Date().toISOString(), minutes: 'Superseded — the same change order was decided on another record.' })
      .eq('decision_kind', 'change_order').eq('status', 'proposed').neq('id', rec.id).contains('proposal', { change_order_id: (rec.proposal as { change_order_id: string }).change_order_id });
  }
  if (outcome === 'approved') {
    const eff = await applyEffect(sb, rec, actor);
    if (eff.error) return { record: rec, applied: false, error: eff.error };
    applied = true;
    if (eff.sanction_event_id) patch.resulting_sanction_event_id = eff.sanction_event_id;
    if (eff.gate_decision_id) patch.resulting_gate_decision_id = eff.gate_decision_id;
  }
  const { data, error } = await sb.from('decision_records').update(patch).eq('id', rec.id).select('*').maybeSingle();
  if (error) return { record: rec, applied, error: error.message };
  return { record: data as DecisionRecord, applied };
}

// ---------------------------------------------------------------------------
// Effects of an approved decision
// ---------------------------------------------------------------------------

async function nextVersion(sb: SupabaseClient, projectId: string, kind: string): Promise<number> {
  const { data } = await sb.from('sanction_events').select('version').eq('project_id', projectId).eq('kind', kind).order('version', { ascending: false }).limit(1);
  return ((data?.[0] as { version: number } | undefined)?.version ?? 0) + 1;
}

async function applyEffect(sb: SupabaseClient, rec: DecisionRecord, actor: Role): Promise<{ error?: string; sanction_event_id?: string; gate_decision_id?: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const p = rec.proposal as Record<string, unknown>;

  if (rec.decision_kind === 'envelope_allocation') {
    const rows = (p.allocations as Array<{ bucket: string; allocated_amount: number; reserve_amount: number; is_mandatory_lane: boolean }>) ?? [];
    const { error } = await sb.from('portfolio_allocations').upsert(rows.map((a) => ({
      project_type: rec.project_type, fiscal_year: rec.fiscal_year, bucket: a.bucket, allocated_amount: a.allocated_amount, reserve_amount: a.reserve_amount,
      is_mandatory_lane: a.is_mandatory_lane, status: 'approved', decision_record_id: rec.id, updated_at: new Date().toISOString(),
    })), { onConflict: 'project_type,fiscal_year,bucket' });
    return error ? { error: error.message } : {};
  }

  if (rec.decision_kind === 'waterline_approval' || rec.decision_kind === 'continuation') {
    const rows = (p.decisions as Array<{ project_id: string; project_code: string; outcome: 'approve' | 'defer'; amount: number; is_continuation: boolean }>) ?? [];
    let lastId: string | undefined;
    for (const d of rows) {
      if (d.outcome === 'defer') {
        const { error } = await sb.from('projects').update({ lifecycle_status: 'deferred' }).eq('id', d.project_id);
        if (error) return { error: error.message };
        continue;
      }
      // A project deferred or cancelled after this proposal was drafted (e.g. displaced
      // by a change order) is not re-funded by an older proposal; it waits for the next run.
      const { data: cur } = await sb.from('projects').select('lifecycle_status').eq('id', d.project_id).maybeSingle();
      const curStatus = (cur as { lifecycle_status?: string } | null)?.lifecycle_status;
      if (curStatus === 'deferred' || curStatus === 'cancelled' || curStatus === 'closed') continue;
      const kind = d.is_continuation ? 'continuation' : 'waterline_envelope';
      const version = await nextVersion(sb, d.project_id, kind);
      const { data: se, error: seErr } = await sb.from('sanction_events').insert({
        project_id: d.project_id, kind, version, amount: d.amount, fiscal_year: rec.fiscal_year, authorised_by: rec.decided_by_name ?? actor.name, authorised_by_body: rec.required_body_key,
        authorised_on: today, decision_record_id: rec.id, source_system: 'APP',
        notes: d.is_continuation ? `FY${rec.fiscal_year} continuation slice approved at the waterline` : `FY${rec.fiscal_year} envelope granted at the waterline (discovery allowance released; full spend at the commit gate)`,
      }).select('id').maybeSingle();
      if (seErr) return { error: seErr.message };
      lastId = (se as { id: string } | null)?.id;
      const { data: proj } = await sb.from('projects').select('fiscal_years_approved, lifecycle_status').eq('id', d.project_id).maybeSingle();
      const years = Array.from(new Set([...(((proj as { fiscal_years_approved?: number[] } | null)?.fiscal_years_approved) ?? []), rec.fiscal_year as number])).sort();
      const ls = (proj as { lifecycle_status?: string } | null)?.lifecycle_status;
      const { error } = await sb.from('projects').update({ fiscal_years_approved: years, lifecycle_status: ls === 'active' || ls === 'on_hold' ? ls : 'approved' }).eq('id', d.project_id);
      if (error) return { error: error.message };
    }
    return { sanction_event_id: lastId };
  }

  if (rec.decision_kind === 'commit_baseline') {
    if (!rec.project_id) return { error: 'commit_baseline needs a project' };
    const { data: project } = await sb.from('projects').select('*').eq('id', rec.project_id).maybeSingle<Project>();
    if (!project || !project.stage_template_id) return { error: 'project or template missing' };
    const { data: template } = await sb.from('stage_templates').select('*').eq('id', project.stage_template_id).maybeSingle<StageTemplate>();
    const stage = commitStage(template);
    if (!template || !stage) return { error: 'no commit stage on template' };
    const amount = Number(rec.amount ?? project.requested_budget ?? 0);
    const capex = (p.capex_share_pct as number | null | undefined) ?? project.business_case?.capex_share_pct ?? null;
    const { data: gd, error: gErr } = await sb.from('gate_decisions').insert({
      project_id: project.id, stage_seq: stage.seq, gate_name: stage.gate_name, decision: 'go', decided_on: today,
      decided_by: rec.decided_by_name ?? actor.name, decided_by_role_type: actor.role_type, criteria_scores: (p.criteria_scores as Record<string, unknown> | null) ?? null,
      case_snapshot: { ...(project.business_case ?? {}), budget: amount, capex_share_pct: capex }, notes: rec.conditions ?? (p.notes as string | null) ?? null,
      source_system: 'APP', decision_record_id: rec.id,
    }).select('id').maybeSingle();
    if (gErr) return { error: gErr.message };
    const version = await nextVersion(sb, project.id, 'sg1_baseline');
    const { data: se, error: seErr } = await sb.from('sanction_events').insert({
      project_id: project.id, kind: 'sg1_baseline', version, amount, fiscal_year: project.fiscal_year, authorised_by: rec.decided_by_name ?? actor.name, authorised_by_body: rec.required_body_key,
      authorised_on: today, decision_record_id: rec.id, source_system: 'APP', notes: `Scope and budget locked at ${stage.gate_name}${capex != null ? ` · capital share ${capex}%` : ''}`,
    }).select('id').maybeSingle();
    if (seErr) return { error: seErr.message };
    const next = nextStage(template, stage.seq);
    const { error } = await sb.from('projects').update({
      approved_budget_initial: amount, approved_budget_current: amount, current_stage: next ? next.seq : stage.seq, lifecycle_status: next ? 'active' : 'closed',
      business_case: capex != null ? { ...(project.business_case ?? {}), capex_share_pct: capex } : project.business_case,
    }).eq('id', project.id);
    if (error) return { error: error.message };
    return { sanction_event_id: (se as { id: string } | null)?.id, gate_decision_id: (gd as { id: string } | null)?.id };
  }

  if (rec.decision_kind === 'change_order') {
    const coId = p.change_order_id as string | undefined;
    if (!coId) return { error: 'change_order needs change_order_id' };
    const { error } = await sb.from('change_orders').update({ status: 'Approved', decision_record_id: rec.id, approval_routing: `Approved by ${rec.required_body_key.replace(/_/g, ' ')} (${rec.decided_by_name ?? actor.name})` }).eq('id', coId);
    if (error) return { error: error.message };
    if (rec.project_id) {
      const { data: co } = await sb.from('change_orders').select('cost_impact_m').eq('id', coId).maybeSingle();
      const delta = Number((co as { cost_impact_m: number } | null)?.cost_impact_m ?? 0) * 1_000_000;
      if (delta && (p.funding_source as string) !== 'project_contingency') {
        const { data: proj } = await sb.from('projects').select('approved_budget_current').eq('id', rec.project_id).maybeSingle();
        const cur = Number((proj as { approved_budget_current: number } | null)?.approved_budget_current ?? 0);
        await sb.from('projects').update({ approved_budget_current: cur + delta }).eq('id', rec.project_id);
      }
    }
    // A displacement-funded change is paid for by another project: the board's
    // approval defers the named project (if it has not committed yet) and
    // records why, so the money trail is visible on both projects.
    if ((p.funding_source as string) === 'displacement' && typeof p.displaces === 'string' && p.displaces) {
      const { data: victim } = await sb.from('projects').select('id, code, lifecycle_status, current_stage, stage_template_id').eq('code', p.displaces).maybeSingle<Pick<Project, 'id' | 'code' | 'lifecycle_status' | 'current_stage' | 'stage_template_id'>>();
      if (victim && (victim.lifecycle_status === 'proposed' || victim.lifecycle_status === 'approved')) {
        await sb.from('projects').update({ lifecycle_status: 'deferred' }).eq('id', victim.id);
        await sb.from('gate_decisions').insert({
          project_id: victim.id, stage_seq: victim.current_stage ?? 0, gate_name: 'Portfolio decision', decision: 'defer', decided_on: today,
          decided_by: rec.decided_by_name ?? actor.name, decided_by_role_type: actor.role_type, source_system: 'APP', decision_record_id: rec.id,
          notes: `Deferred to fund change order on ${rec.title} (${rec.required_body_key.replace(/_/g, ' ')} decision). Case kept; re-enters at the next waterline.`,
        });
      }
    }
    return {};
  }

  if (rec.decision_kind === 'hold' || rec.decision_kind === 'cancel') {
    if (!rec.project_id) return { error: `${rec.decision_kind} needs a project` };
    const { data: project } = await sb.from('projects').select('*').eq('id', rec.project_id).maybeSingle<Project>();
    if (!project) return { error: 'project missing' };
    const { data: template } = project.stage_template_id ? await sb.from('stage_templates').select('*').eq('id', project.stage_template_id).maybeSingle<StageTemplate>() : { data: null };
    const stage = stageAt(template, project.current_stage ?? 0);
    const { data: gd, error: gErr } = await sb.from('gate_decisions').insert({
      project_id: project.id, stage_seq: project.current_stage ?? 0, gate_name: stage?.gate_name ?? 'Portfolio decision', decision: rec.decision_kind === 'hold' ? 'hold' : 'kill',
      decided_on: today, decided_by: rec.decided_by_name ?? actor.name, decided_by_role_type: actor.role_type, notes: rec.conditions ?? (p.notes as string | null) ?? null,
      hold_until: rec.decision_kind === 'hold' ? ((p.hold_until as string | null) ?? null) : null, source_system: 'APP', decision_record_id: rec.id,
    }).select('id').maybeSingle();
    if (gErr) return { error: gErr.message };
    const patch = rec.decision_kind === 'hold' ? { lifecycle_status: 'on_hold' } : { lifecycle_status: 'cancelled', status: 'Closed' };
    const { error } = await sb.from('projects').update(patch).eq('id', project.id);
    if (error) return { error: error.message };
    return { gate_decision_id: (gd as { id: string } | null)?.id };
  }

  if (rec.decision_kind === 'reserve_draw') {
    if (!rec.project_id) return {};
    const version = await nextVersion(sb, rec.project_id, 'continuation');
    const { data: se, error } = await sb.from('sanction_events').insert({
      project_id: rec.project_id, kind: 'continuation', version, amount: rec.amount ?? 0, fiscal_year: rec.fiscal_year, authorised_by: rec.decided_by_name ?? actor.name, authorised_by_body: rec.required_body_key,
      authorised_on: today, decision_record_id: rec.id, source_system: 'APP', notes: `In-year reserve draw: ${(p.reason as string | null) ?? ''}`,
    }).select('id').maybeSingle();
    return error ? { error: error.message } : { sanction_event_id: (se as { id: string } | null)?.id };
  }
  return {};
}

/** Whether a project is past its commit gate — used to pick pre/post-commit rules. */
export async function projectIsCommitted(sb: SupabaseClient, project: Pick<Project, 'id' | 'stage_template_id'>): Promise<boolean> {
  if (!project.stage_template_id) return false;
  const [{ data: template }, { data: decisions }] = await Promise.all([
    sb.from('stage_templates').select('*').eq('id', project.stage_template_id).maybeSingle<StageTemplate>(),
    sb.from('gate_decisions').select('*').eq('project_id', project.id),
  ]);
  return isCommitted(template, (decisions ?? []) as never[]);
}


// ---- Inbox: what the signed-in role must act on ------------------------------

/** True when this role must act on the record: decide for its body, or supply a concurrence it still owes. */
export function isActionableBy(rec: DecisionRecord, myBodyKeys: string[]): 'decide' | 'concur' | null {
  if (rec.status !== 'proposed') return null;
  const owes = (rec.required_concurrences ?? []).some((k) => myBodyKeys.includes(k) && !(rec.concurrences ?? []).some((c) => c.body_key === k && c.outcome === 'concur'));
  if (owes) return 'concur';
  if (myBodyKeys.includes(rec.required_body_key)) return 'decide';
  return null;
}

/** Open IT decisions that need this role, newest first — for header badges and project banners. */
export async function loadMyInbox(sb: SupabaseClient, role: Role): Promise<{ records: Array<DecisionRecord & { action: 'decide' | 'concur' }>; codes: Record<string, string> }> {
  const g = await loadGovernance(sb, 'it');
  const mine = bodiesFor(g, role);
  if (mine.length === 0) return { records: [], codes: {} };
  const { data } = await sb.from('decision_records').select('*').eq('project_type', 'it').eq('status', 'proposed').order('proposed_at', { ascending: false }).limit(200);
  const records = ((data ?? []) as DecisionRecord[]).map((r) => ({ ...r, action: isActionableBy(r, mine) })).filter((r): r is DecisionRecord & { action: 'decide' | 'concur' } => r.action !== null);
  const ids = Array.from(new Set(records.map((r) => r.project_id).filter((x): x is string => !!x)));
  const codes: Record<string, string> = {};
  if (ids.length) {
    const { data: projs } = await sb.from('projects').select('id, code').in('id', ids);
    for (const p of (projs ?? []) as Array<{ id: string; code: string }>) codes[p.id] = p.code;
  }
  return { records, codes };
}
