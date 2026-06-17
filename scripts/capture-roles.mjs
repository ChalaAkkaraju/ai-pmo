/**
 * Capture each role's dashboard, to show how the view varies by role.
 *   node scripts/capture-roles.mjs        (dev server must be up)
 *
 * Saves docs/book/figures/role-<token>-dashboard.png for every role — the full
 * landing dashboard, so the header identity, the "Your {role} KPIs" strip and the
 * section emphasis are all visible. Override the list with $env:ROLES if needed.
 */
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('docs/book/figures');
const VIEWPORT = { width: 1360, height: 1000, deviceScaleFactor: 2 };
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

const ROLES = (process.env.ROLES ||
  'demo-pm,demo-procurement,demo-risk,demo-sponsor,demo-commercial,demo-project-controls,demo-program-manager,demo-engineering-manager,demo-construction-manager,demo-hse-manager'
).split(',').map((r) => r.trim()).filter(Boolean);

async function hideChrome(page, token) {
  const t = token, e = encodeURIComponent(token);
  await page.addStyleTag({ content:
    `.no-print{display:none !important}\n` +
    `a[href="/access/${t}"],a[href="/access/${t}/"],a[href="/access/${e}"],a[href="/access/${e}/"]{display:none !important}`
  }).catch(() => {});
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  // Defuse the first-visit welcome gate once per browser profile — otherwise
  // every capture lands on the welcome page instead of the dashboard.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => localStorage.setItem('pmo-welcome-skip', '1'));
  let ok = 0;
  for (const token of ROLES) {
    process.stdout.write(`  ${token} ... `);
    try {
      await page.goto(`${BASE}/access/${encodeURIComponent(token)}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 900));
      await hideChrome(page, token);
      const el = await page.$('main');
      const file = `role-${token}-dashboard.png`;
      if (el) { await capture(page, el, path.join(OUT, file)); console.log('saved', file); ok++; }
      else { console.log('no <main> — is the token valid?'); }
      // The role KPI strip is the differentiator — capture it on its own when present
      const strip = await page.evaluateHandle(() => {
        const h = [...document.querySelectorAll('h2')].find((x) => /your .* kpis/i.test(x.textContent || ''));
        return h ? h.closest('section') : null;
      });
      const stripEl = strip.asElement && strip.asElement();
      if (stripEl) { const sf = `role-${token}-kpis.png`; await capture(page, stripEl, path.join(OUT, sf)); console.log('         + ' + sf); }
    } catch (e) { console.log('FAILED', e.message); }
  }
  await browser.close();
  console.log(`\nDone. ${ok}/${ROLES.length} role dashboards in docs/book/figures/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
