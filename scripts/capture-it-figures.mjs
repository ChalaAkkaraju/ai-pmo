/**
 * Book figure capture — IT workspace (Part VI of the Business Edition).
 * Drives the running app with Puppeteer, signed in as the IT portfolio manager,
 * and saves print-ready PNGs of the IT pages into docs/book/figures/.
 *
 * RUN ON YOUR WINDOWS MACHINE (the dev server must be up):
 *   1) pnpm dev                          # app on http://localhost:3000
 *   2) node scripts/capture-it-figures.mjs
 *
 * Optional overrides (PowerShell):
 *   $env:IT_PROJECT="NW-IT-0002"         # project for the project-page figures
 *   $env:CAPTURE_ROLE="it_portfolio_manager"
 *   $env:BASE_URL="http://localhost:3000"
 *
 * Credentials come from users.seed.json (role_type -> username / password),
 * exactly as scripts/capture-figures.mjs does for the revenue figures.
 * scripts/refresh-book.mjs runs this after the revenue captures.
 */
import puppeteer from 'puppeteer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CAPTURE_ROLE = process.env.CAPTURE_ROLE || 'it_portfolio_manager';
const PROJECT = process.env.IT_PROJECT || 'NW-IT-0002';
const OUT = path.resolve('docs/book/figures');
const VIEWPORT = { width: 1360, height: 1000, deviceScaleFactor: 2 };
const ACTIVE_PANEL = '[role="tabpanel"][data-state="active"]';
const MAX_FIG_PX = 1650;

// filename -> caption; appended to figures-index.md
const CAPTIONS = {
  '20-it-portfolio-overview.png':      'IT portfolio — Overview: fiscal-year envelope by bucket, attention ribbon, lifecycle mix.',
  '21-it-portfolio-waterline.png':     'IT portfolio — Waterline: ranking within each bucket, cumulative to the line, first below and shortfall.',
  '22-it-portfolio-decisions.png':     'IT portfolio — Decisions: open records, yours first, with routing rule and concurrence state.',
  '23-it-portfolio-delivery.png':      'IT portfolio — Delivery: running projects and gate position, holds with time boxes, displacement register.',
  '24-it-portfolio-governance.png':    'IT portfolio — Who decides what: the delegation-of-authority matrix and the decision bodies.',
  '25-it-intake.png':                  'IT intake — the business-case form.',
  '26-it-project-overview.png':        'IT project — Overview: business case, portfolio and gate position, continuation, displacement, benefits.',
  '27-it-project-gates.png':           'IT project — Gates: stage rail, exit criteria and the Go / Hold / Recycle / Cancel decision.',
  '28-it-project-change-orders.png':   'IT project — Change orders with funding source, routing and state.',
};

const settle = (ms) => new Promise((r) => setTimeout(r, ms));

function loadCreds(roleType) {
  const seed = JSON.parse(readFileSync(path.resolve('users.seed.json'), 'utf8'));
  const e = seed[roleType];
  if (!e || !e.password) throw new Error(`No credentials for role_type "${roleType}" in users.seed.json`);
  const username = e.username || String(e.email || '').split('@')[0].toLowerCase();
  return { username, password: e.password };
}

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#username', { timeout: 15000 });
  await page.type('#username', username);
  await page.type('#password', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  if (/\/login|\/change-password/.test(page.url())) {
    throw new Error(`Sign-in did not reach the app (landed on ${page.url()}). Check the ${username} credentials in users.seed.json.`);
  }
  // Skip the first-visit welcome gate for every later navigation.
  await page.evaluate(() => { try { localStorage.setItem('pmo-welcome-skip', '1'); } catch {} });
}

async function goto(page, rel) {
  await page.goto(`${BASE}${rel}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.addStyleTag({ content: `.no-print{display:none !important}` }).catch(() => {});
}

async function capture(page, el, target) {
  const box = await el.boundingBox();
  if (box && box.height > MAX_FIG_PX) {
    await page.screenshot({ path: target, captureBeyondViewport: true,
      clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.ceil(box.width), height: MAX_FIG_PX } });
  } else {
    await el.screenshot({ path: target });
  }
}

async function shoot(page, selector, file) {
  let el = null;
  for (let attempt = 0; attempt < 2 && !el; attempt++) {
    await settle(attempt === 0 ? 900 : 1500);
    try { await page.waitForSelector(selector, { timeout: 9000 }); el = await page.$(selector); } catch {}
  }
  const target = path.join(OUT, file);
  if (el) { await capture(page, el, target); console.log('  saved', file); return; }
  const m = await page.$('main');
  if (m) { await capture(page, m, target); console.log('  saved', file, '(main fallback)'); return; }
  await page.screenshot({ path: target, fullPage: true });
  console.log('  saved', file, '(full-page fallback)');
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const { username, password } = loadCreds(CAPTURE_ROLE);
  console.log('signing in as', username, `(role_type ${CAPTURE_ROLE})`);
  await login(page, username, password);

  // IT portfolio page — the tab is chosen by the URL hash.
  for (const [rel, file] of [
    ['/portfolio/it',             '20-it-portfolio-overview.png'],
    ['/portfolio/it#rank',        '21-it-portfolio-waterline.png'],
    ['/portfolio/it#decisions',   '22-it-portfolio-decisions.png'],
    ['/portfolio/it#running',     '23-it-portfolio-delivery.png'],
    ['/portfolio/it#governance',  '24-it-portfolio-governance.png'],
    ['/intake/it',                '25-it-intake.png'],
  ]) {
    console.log(rel);
    await goto(page, rel);
    // A hash navigation to the same path does not reload; force the tab by
    // dispatching hashchange after load so the shell applies it.
    await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await shoot(page, 'main', file);
  }

  // IT project page — tabs are URL-driven (?tab=...); capture the active panel.
  const proj = `/projects/${encodeURIComponent(PROJECT)}`;
  for (const [tab, file] of [
    ['overview', '26-it-project-overview.png'],
    ['gates',    '27-it-project-gates.png'],
    ['cos',      '28-it-project-change-orders.png'],
  ]) {
    console.log('tab', tab);
    await goto(page, `${proj}?tab=${tab}`);
    await shoot(page, ACTIVE_PANEL, file);
  }

  await browser.close();

  // Append the IT rows to the figures index (created by capture-figures.mjs).
  const indexPath = path.join(OUT, 'figures-index.md');
  let index = '';
  try { index = await readFile(indexPath, 'utf8'); } catch {}
  const rows = Object.entries(CAPTIONS).filter(([f]) => !index.includes(`| ${f} |`)).map(([f, cap]) => `| ${f} | A20+ | ${cap} |`);
  if (rows.length) {
    if (!index) index = '# Book figures — index\n\n| File | Chapter | Caption |\n| --- | --- | --- |\n';
    await writeFile(indexPath, index.replace(/\s*$/, '\n') + rows.join('\n') + '\n');
  }
  console.log('\nDone. IT figures in docs/book/figures/');
}

main().catch((e) => { console.error(e); process.exit(1); });
