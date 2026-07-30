/**
 * Capture each role's dashboard, to show how the view varies by role.
 *   node scripts/capture-roles.mjs        (dev server must be up)
 *
 * Signs in as each role's account (credentials read from users.seed.json) and
 * saves docs/book/figures/role-<slug>-dashboard.png (+ -kpis.png) for every role.
 * The figure filenames keep the demo-<slug> scheme the book embeds; the account
 * is resolved from the role_type (slug with "demo-" stripped, hyphens -> "_").
 * Override the list with $env:ROLES if needed.
 */
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('docs/book/figures');
const VIEWPORT = { width: 1360, height: 1000, deviceScaleFactor: 2 };
const MAX_FIG_PX = 1650;

const ROLES = (process.env.ROLES ||
  'demo-pm,demo-procurement,demo-risk,demo-sponsor,demo-commercial,demo-project-controls,demo-program-manager,demo-engineering-manager,demo-construction-manager,demo-hse-manager'
).split(',').map((r) => r.trim()).filter(Boolean);

function loadCreds(roleType) {
  const seed = JSON.parse(readFileSync(path.resolve('users.seed.json'), 'utf8'));
  const e = seed[roleType];
  if (!e || !e.password) throw new Error(`no credentials for role_type "${roleType}"`);
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
  if (/\/login|\/change-password/.test(page.url()))
    throw new Error(`sign-in for ${username} landed on ${page.url()}`);
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

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  let ok = 0;
  for (const slug of ROLES) {
    const roleType = slug.replace(/^demo-/, '').replace(/-/g, '_');
    process.stdout.write(`  ${slug} (${roleType}) ... `);
    try {
      const { username, password } = loadCreds(roleType);
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await login(page, username, password);
      await page.evaluate(() => localStorage.setItem('pmo-welcome-skip', '1'));
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 900));
      await page.addStyleTag({ content: `.no-print{display:none !important}` }).catch(() => {});
      const el = await page.$('main');
      const file = `role-${slug}-dashboard.png`;
      if (el) { await capture(page, el, path.join(OUT, file)); console.log('saved', file); ok++; }
      else { console.log('no <main>'); }
      const strip = await page.evaluateHandle(() => {
        const h = [...document.querySelectorAll('h2')].find((x) => /your .* kpis/i.test(x.textContent || ''));
        return h ? h.closest('section') : null;
      });
      const stripEl = strip.asElement && strip.asElement();
      if (stripEl) { const sf = `role-${slug}-kpis.png`; await capture(page, stripEl, path.join(OUT, sf)); console.log('         + ' + sf); }
    } catch (e) { console.log('SKIP', e.message); }
  }
  await browser.close();
  console.log(`\nDone. ${ok}/${ROLES.length} role dashboards in docs/book/figures/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
