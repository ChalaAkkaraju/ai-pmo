/**
 * Compile the two AI PMO book editions from their chapter files.
 *   node scripts/compile-book.mjs
 *
 * Reads the front matter (docs/_fm-*.md) + the chapters in ORDER, concatenates
 * with part dividers, writes docs/AI-PMO-{Business,Technical}-Edition.md, and
 * runs pandoc --toc to produce the .docx (with embedded figures).
 *
 * Technical edition also pulls the original design docs from the "PMO LLM" folder
 * one level above the repo (override with $env:BOOK_PARENT if your layout differs).
 */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve('docs');
const PARENT = process.env.BOOK_PARENT || path.resolve('..');

// Cover injection needs python3 (stdlib only). Detect; skip gracefully if absent.
const PYTHON = ['python3', 'python'].find((c) => {
  try { return spawnSync(c, ['--version'], { shell: process.platform === 'win32' }).status === 0; }
  catch { return false; }
}) || null;

const BUSINESS = [
  { part: 'Part I — Why AI PMO Exists', desc: 'The seam between the cost system and the schedule — and the discipline of building only what no other system owns.' },
  { doc: 'the-problem-ai-pmo-solves-concept' },
  { doc: 'what-belongs-in-ai-pmo-scope-charter' },
  { doc: 'epc-capability-coverage-map' },
  { part: 'Part II — The Money Story', desc: 'Six chapters that follow a contract dollar end to end: earned value, forecast, revenue, cash, margin, change.' },
  { doc: 'earned-value-in-plain-terms-concept' },
  { doc: 'forecasting-cost-revenue-to-eac-concept' },
  { doc: 'revenue-recognition-results-analysis-concept' },
  { doc: 'cash-flow-funding-exposure-concept' },
  { doc: 'margin-as-sold-to-as-built-concept' },
  { doc: 'change-and-trend-management-concept' },
  { part: 'Part III — Risk, Issues & Performance', desc: 'Quantified risk, disciplined issue management, and the weekly variance rhythm that keeps forecasts honest.' },
  { doc: 'risk-emv-contingency-concept' },
  { doc: 'issue-management-concept' },
  { doc: 'variance-analysis-concept' },
  { part: 'Part IV — Communicating the Intelligence', desc: 'How the numbers become legible — colour and provenance, the executive dashboard, the project workspace, and the agents.' },
  { doc: 'kpi-provenance-colour-coding-proposal' },
  { doc: 'colour-and-iconography-concept' },
  { doc: 'reading-the-executive-dashboard-concept' },
  { doc: 'the-analytics-pages-concept' },
  { doc: 'the-project-workspace-concept' },
  { doc: 'the-ai-agents-concept' },
  { part: 'Part V — Justification & Governance', desc: 'Why these formulas: the standards behind every number, so each figure survives an audit.' },
  { doc: 'why-these-formulas-standards-concept' },
  { part: 'Appendices', desc: 'Reference material.' },
  { doc: 'glossary' },
];

const TECHNICAL = [
  { part: 'Part I — Architecture', desc: 'The system end to end — the stack, the canonical model, and the process spine from booking to closeout.' },
  { doc: 'PMO_LLM_Engineering_Detail', parent: true },
  { doc: 'AI-PMO-Process-and-Architecture-Note', parent: true },
  { part: 'Part II — Data & Integration', desc: 'The consume side: the sync contract, per-object ingestion, exceptions, and provenance tagging.' },
  { doc: 'AI-PMO-Integration-Sync-Contract', parent: true },
  { doc: 'tech-per-object-sync' },
  { part: 'Part III — The Agents', desc: 'Fifteen specialists — their profiles, the router that picks them, and the cross-agent action loop.' },
  { doc: 'agent-technical-profiles' },
  { doc: 'PMO_LLM_Agent_Routing_Design', parent: true },
  { doc: 'tech-cross-agent-actions' },
  { part: 'Part IV — The Synthesis Libraries', desc: 'The deterministic core: every figure computed in pure, testable code before a model ever sees it.' },
  { doc: 'tech-earned-value-library' },
  { doc: 'tech-forecast-library' },
  { doc: 'tech-cash-flow-library' },
  { doc: 'tech-change-orders-library' },
  { doc: 'tech-risk-emv-library' },
  { doc: 'tech-commercial-libraries' },
  { doc: 'tech-portfolio-pagination' },
  { part: 'Part V — Build, AI Concepts & Evaluation', desc: 'How it was built and proven — the rulebook, the AI concepts behind the design, and the release runbooks.' },
  { doc: 'PMO_LLM_Build_Rulebook', parent: true },
  { doc: 'PMO_LLM_AI_Concepts_Explained', parent: true },
  { doc: 'PMO_LLM_RAG_Explained', parent: true },
  { doc: 'PMO_LLM_OpenRouter_Explained', parent: true },
  { doc: 'promote-to-cloud-runbook' },
  { doc: 'pre-deploy-checklist' },
  { part: 'Appendices', desc: 'Reference material.' },
  { doc: 'tech-data-dictionary' },
  { doc: 'AI-PMO-Design-and-Deadcode-Audit', parent: true },
];

function run(cmd, args, opts) {
  return new Promise((res, rej) => {
    // On Windows we spawn through the shell, which splits on spaces — quote any
    // argument containing one (e.g. paths under "C:\\Claude\\Projects\\PMO LLM").
    const win = process.platform === 'win32';
    const a = win ? args.map((x) => (/\s/.test(x) ? `"${x}"` : x)) : args;
    const p = spawn(cmd, a, { stdio: 'inherit', shell: win, ...opts });
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
    p.on('error', rej);
  });
}

/** Shift authored headings down one level (outside code fences) so injected
 *  "# Part …" lines are the only H1s — chapters become H2, sub-sections H3+. */
function shiftHeadings(md) {
  let inFence = false;
  return md.split('\n').map((line) => {
    if (/^(```|~~~)/.test(line)) { inFence = !inFence; return line; }
    if (inFence) return line;
    return /^(#{1,5})\s/.test(line) ? '#' + line : line;
  }).join('\n');
}

async function build(name, fmFile, order) {
  let fm = await readFile(path.join(DOCS, fmFile), 'utf8');
  fm = fm.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''); // drop YAML title block; cover image replaces it
  let out = shiftHeadings(fm);
  for (const it of order) {
    if (it.part) {
      out += `\n\n# ${it.part}\n`;
      if (it.desc) out += `\n::: {custom-style="PartDescription"}\n${it.desc}\n:::\n`;
      continue;
    }
    const p = it.parent ? path.join(PARENT, `${it.doc}.md`) : path.join(DOCS, `${it.doc}.md`);
    if (!existsSync(p)) { console.log('  MISSING:', p); continue; }
    out += '\n\n' + shiftHeadings(await readFile(p, 'utf8'));
  }
  // Colophon — its own closing page, in the quiet PartDescription voice.
  const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'unreleased'; } })();
  const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  out += `\n\n# About this edition\n\n::: {custom-style="PartDescription"}\nAI PMO — ${name} Edition · compiled ${today} · application version ${sha} · screenshots captured from the live application\n:::\n`;

  const md = `AI-PMO-${name}-Edition.md`;
  await writeFile(path.join(DOCS, md), out);
  await run('pandoc', [md, '--toc', '--toc-depth=2', '--reference-doc', '_reference.docx', '--lua-filter', '_keyword.lua', '--lua-filter', '_callouts.lua', '--lua-filter', '_figures.lua', '--resource-path', ['.', path.relative(DOCS, PARENT)].join(path.delimiter), '-o', `AI-PMO-${name}-Edition.docx`], { cwd: DOCS });
  if (PYTHON) {
    const coverPng = `book/figures/cover-${name.toLowerCase()}.png`;
    try {
      await run(PYTHON, [path.resolve('scripts', 'add_cover.py'), `AI-PMO-${name}-Edition.docx`, coverPng], { cwd: DOCS });
    } catch (e) { console.log(`  (cover skipped: ${e.message})`); }
  } else {
    console.log('  (cover skipped — python3 not found on PATH)');
  }
  console.log(`  ${name} Edition compiled (${out.split('\n').length} lines)`);
}

for (const [name, fm, order] of [['Business', '_fm-business.md', BUSINESS], ['Technical', '_fm-technical.md', TECHNICAL]]) {
  try { await build(name, fm, order); }
  catch (e) { console.error(`  ${name} FAILED — is AI-PMO-${name}-Edition.docx open in Word? Close it and re-run. (${e.message})`); }
}
console.log('Book compiled.');
