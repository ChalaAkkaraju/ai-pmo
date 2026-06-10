/**
 * Capture the Ask AI Assistant (role-aware starter chips) for each role, in
 * both project and portfolio context — for the per-role user guides.
 *
 * RUN ON YOUR MACHINE with the dev server up (pnpm dev):
 *   node scripts/capture-agents.mjs
 * Optional overrides:
 *   $env:BASE_URL="http://localhost:3000"; $env:PROJECT="NW-PWR-2695"
 *
 * Writes docs/book/figures/role-<token>-assistant-project.png and
 *        docs/book/figures/role-<token>-assistant-portfolio.png
 * Then re-run `node scripts/build-role-guides.mjs` to embed them.
 */
import puppeteer from 'puppeteer';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('docs', 'book', 'figures');
const TOKENS = (process.env.ROLES ||
  'demo-pm,demo-program-manager,demo-risk,demo-procurement,demo-commercial,demo-construction-manager,demo-engineering-manager,demo-hse-manager,demo-project-controls,demo-sponsor'
).split(',').map((t) => t.trim());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function discoverProject(page) {
  if (process.env.PROJECT) return process.env.PROJECT;
  await page.goto(`${BASE}/access/demo-pm`, { waitUntil: 'networkidle2' });
  const code = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a[href*="/projects/"]'))[0];
    if (!a) return null;
    const m = a.getAttribute('href').match(/\/projects\/([^/?#]+)/);
    return m ? m[1] : null;
  });
  return code;
}

async function shoot(page, token, url, suffix) {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await sleep(800);
  const btn = await page.$('button[aria-label="Ask AI Assistant"]');
  if (!btn) { console.log(`  ${token} ${suffix}: assistant button not found — skipped`); return; }
  await btn.click();
  await page.waitForSelector('div[role="dialog"][aria-label="Agent chat"]', { timeout: 8000 });
  await sleep(700); // let the role-aware chips render
  const panel = await page.$('div[role="dialog"][aria-label="Agent chat"]');
  const file = path.join(OUT, `role-${token}-assistant-${suffix}.png`);
  await panel.screenshot({ path: file });
  console.log(`  saved role-${token}-assistant-${suffix}.png`);
}

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1100, deviceScaleFactor: 2 });

  const project = await discoverProject(page);
  console.log(`Using project: ${project ?? '(none found — portfolio shots only)'}`);

  for (const token of TOKENS) {
    if (project) await shoot(page, token, `${BASE}/access/${token}/projects/${project}`, 'project');
    await shoot(page, token, `${BASE}/access/${token}`, 'portfolio');
  }
  await browser.close();
  console.log(`Done. Assistant screenshots in docs/book/figures/ — re-run build-role-guides.mjs to embed them.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
