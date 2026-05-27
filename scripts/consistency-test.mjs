/**
 * Agent consistency test.
 *
 * Fires N sequential calls to /api/agent with the same prompt, project, agent,
 * and mode. Captures each output to its own file plus a summary of timing,
 * tokens, and cost. Designed to be run while the Windows dev server is live
 * on http://localhost:3000.
 *
 * Outputs land in ./consistency-test/ relative to where you ran the script:
 *   - run-1.md … run-5.md      (markdown outputs, exactly what the agent returned)
 *   - prompt.txt                (the exact prompt we sent, for reproducibility)
 *   - summary.json              (per-run timing, tokens, cost, output_id)
 *
 * Usage (in PowerShell from project root):
 *   node scripts/consistency-test.mjs
 *
 * Optional environment-variable overrides:
 *   AGENT_TOKEN=demo-pm-token-replace-me
 *   PROJECT_CODE=NW-PWR-2686
 *   RUNS=5
 *   CONCISE=true
 *   BASE_URL=http://localhost:3000
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// ---- Configuration (override via env vars if you like) ----
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const TOKEN = process.env.AGENT_TOKEN ?? 'demo-pm-token-replace-me';
const PROJECT_CODE = process.env.PROJECT_CODE ?? 'NW-PWR-2686';
const AGENT_TYPE = process.env.AGENT_TYPE ?? 'risk_analyst';
const CONCISE = (process.env.CONCISE ?? 'true').toLowerCase() === 'true';
const RUNS = Number.parseInt(process.env.RUNS ?? '5', 10);
const OUT_DIR = 'consistency-test';

const PROMPT =
  process.env.PROMPT ??
  'Review the current risk register and identify which two risks deserve the most management attention through the remaining warranty tail. Three sentences each.';

// ---- Helpers ----
function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

function fmtElapsed(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

async function main() {
  console.log('=== Agent consistency test ===');
  console.log(`Base URL:    ${BASE_URL}`);
  console.log(`Token:       ${TOKEN}`);
  console.log(`Project:     ${PROJECT_CODE}`);
  console.log(`Agent:       ${AGENT_TYPE}`);
  console.log(`Mode:        ${CONCISE ? 'quick (concise:true)' : 'full (concise:false)'}`);
  console.log(`Runs:        ${RUNS}`);
  console.log(`Output dir:  ${OUT_DIR}/`);
  console.log(`Prompt:      "${PROMPT}"`);
  console.log('');

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, 'prompt.txt'), PROMPT + '\n');

  const summary = {
    config: { BASE_URL, TOKEN, PROJECT_CODE, AGENT_TYPE, CONCISE, RUNS },
    prompt: PROMPT,
    started_at: new Date().toISOString(),
    runs: [],
  };

  for (let i = 1; i <= RUNS; i++) {
    process.stdout.write(`Run ${pad(i)}/${RUNS} … `);
    const start = Date.now();

    let res;
    try {
      res = await fetch(`${BASE_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: TOKEN,
          agent_type: AGENT_TYPE,
          project_code: PROJECT_CODE,
          user_prompt: PROMPT,
          concise: CONCISE,
          skip_log: true, // don't pollute the activity feed
        }),
      });
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`ERROR after ${fmtElapsed(elapsed)} — ${err.message}`);
      summary.runs.push({ run: i, ok: false, error: err.message, elapsed_ms: elapsed });
      continue;
    }

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      console.log(`HTTP ${res.status} after ${fmtElapsed(elapsed)} — ${errText.slice(0, 120)}`);
      summary.runs.push({
        run: i,
        ok: false,
        http_status: res.status,
        error: errText.slice(0, 500),
        elapsed_ms: elapsed,
      });
      continue;
    }

    const data = await res.json();
    const filename = `run-${pad(i)}.md`;
    await writeFile(join(OUT_DIR, filename), data.output_md ?? '');

    const tokens = data.tokens_used ?? null;
    const cost = data.cost_usd ?? null;
    const chars = data.output_md?.length ?? 0;

    summary.runs.push({
      run: i,
      ok: true,
      elapsed_ms: elapsed,
      output_chars: chars,
      tokens_used: tokens,
      cost_usd: cost,
      agent_type_resolved: data.agent_type,
      file: filename,
    });

    console.log(
      `${fmtElapsed(elapsed)} · ${chars} chars · ${tokens ?? '?'} tok · $${(cost ?? 0).toFixed(4)}`,
    );
  }

  summary.finished_at = new Date().toISOString();

  // Totals
  const okRuns = summary.runs.filter((r) => r.ok);
  const totalCost = okRuns.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalTokens = okRuns.reduce((s, r) => s + (r.tokens_used ?? 0), 0);
  const totalTime = summary.runs.reduce((s, r) => s + (r.elapsed_ms ?? 0), 0);
  summary.totals = {
    successful_runs: okRuns.length,
    failed_runs: summary.runs.length - okRuns.length,
    total_cost_usd: Number(totalCost.toFixed(4)),
    total_tokens: totalTokens,
    total_elapsed_ms: totalTime,
  };

  await writeFile(join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log('');
  console.log('=== Done ===');
  console.log(`Successful runs: ${okRuns.length}/${RUNS}`);
  console.log(`Total cost:      $${totalCost.toFixed(4)}`);
  console.log(`Total tokens:    ${totalTokens.toLocaleString()}`);
  console.log(`Total wall time: ${fmtElapsed(totalTime)}`);
  console.log('');
  console.log(`Outputs:         ${OUT_DIR}/run-01.md … run-${pad(RUNS)}.md`);
  console.log(`Summary:         ${OUT_DIR}/summary.json`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
