/**
 * CLI test script for Phase 2.3 — agent invocation end-to-end.
 *
 * Invokes the runAgent() orchestrator directly (no HTTP needed) with sample
 * inputs to verify that:
 *   1. Role token lookup works
 *   2. Permission check passes
 *   3. Agent prompt loads from disk
 *   4. Worked example loads from Supabase
 *   5. Project state assembles correctly
 *   6. OpenRouter call succeeds with Opus 4.7
 *   7. Result writes to agent_outputs
 *
 * Run with: pnpm test:agent
 *
 * Defaults:
 *   - Agent: risk_analyst
 *   - Project: Mariposa (NW-REN-2511)
 *   - Role: the PM (first row in roles table)
 *   - Prompt: a small variance-update test prompt
 *
 * Override via env vars: TEST_AGENT, TEST_PROJECT, TEST_PROMPT
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { runAgent } from '../lib/agent-runner';
import { createSupabaseServiceClient } from '../lib/supabase';
import { log, section } from './lib/log';
import type { AgentType } from '../lib/types';

async function main() {
  log.header('Phase 2.3 — agent invocation test');

  // Look up the PM role token (first row in roles table where role_type = 'pm')
  const supabase = createSupabaseServiceClient();
  const { data: pmRole, error: pmErr } = await supabase
    .from('roles')
    .select('token, name, role_type')
    .eq('role_type', 'pm')
    .single();

  if (pmErr || !pmRole) {
    log.error(`Could not look up PM role: ${pmErr?.message ?? 'no row'}`);
    log.info('Make sure you ran `pnpm seed` to populate the roles table.');
    process.exit(1);
  }

  const agentType: AgentType = (process.env.TEST_AGENT as AgentType) ?? 'risk_analyst';
  const projectCode = process.env.TEST_PROJECT ?? 'NW-REN-2511';
  const userPrompt =
    process.env.TEST_PROMPT ??
    'Briefly review the current Mariposa risk register and identify which two risks deserve the most management attention through the remaining warranty tail. Three sentences each, no more.';

  section('Inputs');
  log.info(`Agent:        ${agentType}`);
  log.info(`Project:      ${projectCode}`);
  log.info(`Role:         ${pmRole.name} (${pmRole.role_type})`);
  log.info(`Token (8):    ${pmRole.token.slice(0, 8)}…`);
  log.info(`User prompt:  ${userPrompt}`);

  section('Calling runAgent() — this can take 10-60 seconds');
  const start = Date.now();
  const result = await runAgent({
    token: pmRole.token,
    agent_type: agentType,
    project_code: projectCode,
    user_prompt: userPrompt,
  });
  const durationS = ((Date.now() - start) / 1000).toFixed(1);

  if (!result.ok) {
    log.error(`Failed (${result.status}): ${result.error}`);
    process.exit(1);
  }

  section(`Result (${durationS}s)`);
  log.success(`Agent output written. ID: ${result.agent_output_id}`);
  log.info(`Model:        ${result.model ?? 'unknown'}`);
  log.info(`Tokens used:  ${result.tokens_used ?? 'not reported'}`);
  log.info(`Cost (USD):   ${result.cost_usd ?? 'not reported'}`);
  log.info('');
  log.info('═══════════════ OUTPUT MARKDOWN ═══════════════');
  console.log(result.output_md);
  log.info('═══════════════════════════════════════════════');

  log.header('Test complete — Phase 2.3 working end-to-end');
  log.info('Next: Phase 2.4 — UI build that invokes /api/agent from a chat component.');
}

main().catch((err) => {
  console.error('test-agent crashed:', err);
  process.exit(1);
});
