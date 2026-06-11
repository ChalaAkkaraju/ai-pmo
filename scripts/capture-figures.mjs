/**
 * Book figure capture — drives the running app with Puppeteer and saves
 * high-resolution PNGs of the key views into docs/book/figures/.
 *
 * RUN ON YOUR WINDOWS MACHINE (the dev server must be up):
 *   1) pnpm dev            # in one terminal, app on http://localhost:3000
 *   2) node scripts/capture-figures.mjs
 *
 * Optional overrides (PowerShell):
 *   $env:TOKEN="demo-pm-xxxx"; $env:PROJECT="EPC-0001"; node scripts/capture-figures.mjs
 *   $env:BASE_URL="http://localhost:3000"
 *
 * Notes:
 *   - Project tabs are captured by URL (?tab=...) so no clicking is needed.
 *   - The two Cost sub-lenses (Revenue, Cash flow) are reached by a click.
 *   - Each shot grabs just the relevant element (the active tab panel, or the
 *     page's <main>), at 2x scale, on the light theme — print-ready.
 *   - Re-run any time the UI changes; every figure refreshes consistently.
 */
import puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.TOKEN || 'demo-pm';
let PROJECT = process.env.PROJECT || '';
const OUT = path.resolve('docs/book/figures');
const VIEWPORT = { width: 1360, height: 1000, deviceScaleFactor: 2 };
const ACTIVE_PANEL = '[role="tabpanel"][data-state="active"]';

// filename -> { chapter, caption } for the figures index
const CAPTIONS = {
  '00-welcome-gateway.png':             ['A1',  'The welcome gateway — what AI PMO is, in one screen.'],
  '01-portfolio-dashboard.png':        ['A1',  'Executive portfolio dashboard — health, lifecycle and hot list.'],
  '02-portfolio-earned-value.png':     ['A5',  'Portfolio earned value — CPI×SPI quadrant and worst-performer register.'],
  '03-portfolio-cash-flow.png':        ['A8',  'Portfolio cash-flow — funding exposure with segment / project drill-down.'],
  '04-portfolio-risks.png':            ['A11', 'Portfolio risk analytics — EMV exposure and heatmap.'],
  '05-portfolio-changes.png':          ['A10', 'Portfolio change & trend — funded vs absorbed, revenue-at-risk.'],
  '06-process-architecture.png':       ['B2',  'End-to-end process / architecture flow across SAP PS and the scheduler.'],
  '07-coverage-framework.png':         ['A3',  'Capability coverage framework (author / synthesise / engine / human).'],
  '10-project-overview.png':           ['A19', 'Project workspace — Overview tab leading with EV and needs-attention.'],
  '11-project-earned-value.png':       ['A5',  'Project earned value — S-curve, CPI/SPI, earned schedule, EV by WBS.'],
  '12-project-cost-to-date.png':       ['A6',  'Cost tab — Cost-to-date lens: element mix and WBS-phase reconciliation.'],
  '13-project-revenue-recognition.png':['A7',  'Cost tab — Revenue recognition lens: cost-based POC (IFRS 15).'],
  '14-project-cash-flow.png':          ['A8',  'Cost tab — Cash flow lens: cumulative cash in vs out, funding exposure.'],
  '15-project-risks.png':              ['A11', 'Project risk register — inherent vs residual, EMV, mitigation.'],
  '16-project-changes.png':            ['A10', 'Project change & trend register — pipeline, margin impact, drivers.'],
  '17-project-variance.png':           ['A13', 'Project variance analysis.'],
  '18-project-structure.png':          ['B3',  'Project structure — canonical WBS tree with provenance.'],
  '19-project-schedule.png':           ['A5',  'Project schedule — timeline and milestones.'],
};

async function settle(page, ms = 700) { await new Promise((r) => setTimeout(r, ms)); }

// A figure must fit one Word page or Word clips it at the page boundary. Cap the
// captured height (top portion) so each figure scales to page width without overflow.
// MAX_FIG_PX (CSS px) keeps height*pageWidth/figWidth under a page; 2x scale stays crisp.
const MAX_FIG_PX = 1650;
async function capture(page, el, target) {
  const box = await el.boundingBox();
  if (box && box.height > MAX_FIG_PX) {
    await page.screenshot({ path: target, captureBeyondViewport: true,
      clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.ceil(box.width), height: MAX_FIG_PX } });
  } else {
    await el.screenshot({ path: target });
  }
}

async function goto(page, rel) {
  const url = `${BASE}/access/${encodeURIComponent(TOKEN)}${rel}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
}

async function shoot(page, selector, file) {
  let el = null;
  for (let attempt = 0; attempt < 2 && !el; attempt++) {
    await settle(page, attempt === 0 ? 800 : 1400);
    try { await page.waitForSelector(selector, { timeout: 9000 }); el = await page.$(selector); } catch {}
  }
  const target = path.join(OUT, file);
  if (el) { await capture(page, el, target); console.log('  saved', file); return; }
  const m = await page.$('main');
  if (m) { await capture(page, m, target); console.log('  saved', file, '(main fallback)'); return; }
  await page.screenshot({ path: target, fullPage: true });
  console.log('  saved', file, '(full-page fallback)');
}

async function projectValid(page, code) {
  // A real project renders an active tab panel; a bad code 404s (no panel).
  await goto(page, `/projects/${encodeURIComponent(code)}?tab=overview`);
  return !!(await page.waitForSelector(ACTIVE_PANEL, { timeout: 6000 }).catch(() => null));
}

async function discoverProject(page) {
  // Project anchors live in the portfolio tables on the analytics pages.
  for (const rel of ['/analytics/earned-value', '/analytics/risks', '/analytics/changes']) {
    await goto(page, rel);
    await page.waitForSelector('a[href*="/projects/"]', { timeout: 12000 }).catch(() => {});
    const code = await page.evaluate(() => {
      for (const a of document.querySelectorAll('a[href*="/projects/"]')) {
        const m = (a.getAttribute('href') || '').match(/\/projects\/([^/?#]+)/);
        if (m) return decodeURIComponent(m[1]);
      }
      return '';
    });
    if (code) return code;
  }
  return '';
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Welcome gateway
  console.log('welcome');
  await goto(page, '/welcome');
  // The welcome canvas is full-width with the content centred inside it —
  // shoot the inner container so the figure isn't mostly background.
  await shoot(page, 'main > div', '00-welcome-gateway.png');

  // Dashboard + auto-discover a project code
  console.log('dashboard');
  await goto(page, '');
  await shoot(page, 'main', '01-portfolio-dashboard.png');
  if (PROJECT && !(await projectValid(page, PROJECT))) {
    console.log(`project "${PROJECT}" not found — ignoring it and auto-discovering...`);
    PROJECT = '';
  }
  if (!PROJECT) { console.log('discovering a project from the analytics tables...'); PROJECT = await discoverProject(page); }
  if (!PROJECT) {
    console.error('\nCould not auto-discover a project. Either the TOKEN is wrong, or pin a code:');
    console.error('  $env:PROJECT="<a project code, e.g. from any project URL>"; then re-run.\n');
    await browser.close();
    process.exit(1);
  }
  console.log('using project:', PROJECT);

  // Portfolio / analytics pages (capture the page <main>)
  for (const [rel, file] of [
    ['/analytics/earned-value', '02-portfolio-earned-value.png'],
    ['/analytics/cash-flow',    '03-portfolio-cash-flow.png'],
    ['/analytics/risks',        '04-portfolio-risks.png'],
    ['/analytics/changes',      '05-portfolio-changes.png'],
    ['/architecture',           '06-process-architecture.png'],
    ['/framework',              '07-coverage-framework.png'],
  ]) { console.log(rel); await goto(page, rel); await shoot(page, 'main', file); }

  // Project tabs (URL-driven; capture the active tab panel)
  const proj = `/projects/${encodeURIComponent(PROJECT)}`;
  for (const [tab, file] of [
    ['overview',  '10-project-overview.png'],
    ['ev',        '11-project-earned-value.png'],
    ['cost',      '12-project-cost-to-date.png'],
    ['risks',     '15-project-risks.png'],
    ['cos',       '16-project-changes.png'],
    ['variance',  '17-project-variance.png'],
    ['structure', '18-project-structure.png'],
    ['schedule',  '19-project-schedule.png'],
  ]) { console.log('tab', tab); await goto(page, `${proj}?tab=${tab}`); await shoot(page, ACTIVE_PANEL, file); }

  // Cost sub-lenses (click within the active panel)
  console.log('cost sub-lenses');
  await goto(page, `${proj}?tab=cost`);
  for (const [label, file] of [
    ['Revenue recognition', '13-project-revenue-recognition.png'],
    ['Cash flow',           '14-project-cash-flow.png'],
  ]) {
    await page.waitForSelector(ACTIVE_PANEL, { timeout: 8000 }).catch(() => {});
    await page.evaluate((lbl) => {
      const b = [...document.querySelectorAll('[role="tabpanel"][data-state="active"] button')]
        .find((x) => (x.textContent || '').includes(lbl));
      if (b) b.click();
    }, label);
    await shoot(page, ACTIVE_PANEL, file);
  }

  await browser.close();

  // Write the figures index (filename -> chapter + caption) for easy embedding
  const lines = ['# Book figures — index', '', 'Generated by `scripts/capture-figures.mjs`. Embed in a chapter with:', '', '```markdown', '![Caption](figures/<file>.png)', '```', '', '| File | Chapter | Caption |', '| --- | --- | --- |'];
  for (const [file, [ch, cap]] of Object.entries(CAPTIONS)) lines.push(`| ${file} | ${ch} | ${cap} |`);
  await writeFile(path.join(OUT, 'figures-index.md'), lines.join('\n') + '\n');
  console.log('\nDone. Figures + figures-index.md in docs/book/figures/');
}

main().catch((e) => { console.error(e); process.exit(1); });
