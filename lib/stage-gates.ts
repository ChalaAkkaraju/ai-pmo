/**
 * Stage-gate helpers over stage_templates / gate_decisions (migration 0045).
 * Pure functions; the pages and the agent context both use them.
 */

import type { GateDecision, StageDef, StageTemplate } from './types';

export function stageAt(template: StageTemplate | null | undefined, seq: number | null | undefined): StageDef | null {
  if (!template || seq === null || seq === undefined) return null;
  return template.stages.find((s) => s.seq === seq) ?? null;
}

export function commitStage(template: StageTemplate | null | undefined): StageDef | null {
  return template?.stages.find((s) => s.is_commit) ?? null;
}

/** Has the project passed its commit gate (a GO recorded at the commit stage)? */
export function isCommitted(template: StageTemplate | null | undefined, decisions: GateDecision[]): boolean {
  const c = commitStage(template);
  if (!c) return false;
  return decisions.some((d) => d.stage_seq === c.seq && d.decision === 'go');
}

/** Latest decision recorded for a stage, if any. */
export function latestDecision(decisions: GateDecision[], seq: number): GateDecision | null {
  const rows = decisions.filter((d) => d.stage_seq === seq).sort((a, b) => (a.decided_on < b.decided_on ? 1 : -1));
  return rows[0] ?? null;
}

/**
 * Where a GO at the current stage takes the project. Returns null at the last
 * stage (a GO there closes the project).
 */
export function nextStage(template: StageTemplate | null | undefined, seq: number): StageDef | null {
  if (!template) return null;
  return template.stages.find((s) => s.seq === seq + 1) ?? null;
}

export function gateStatusLabel(d: GateDecision['decision']): string {
  switch (d) {
    case 'go': return 'Go';
    case 'hold': return 'Hold';
    case 'kill': return 'Cancelled';
    case 'recycle': return 'Recycle';
    case 'defer': return 'Deferred';
    case 'resume': return 'Hold lifted';
  }
}
