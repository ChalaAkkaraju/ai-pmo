/**
 * One-step book refresh.
 *   1) Capture all figures from the running app (scripts/capture-figures.mjs)
 *   2) Rebuild every chapter's .docx from its .md via pandoc (embeds the fresh PNGs)
 *
 * RUN ON YOUR WINDOWS MACHINE, with the dev server up (pnpm dev):
 *   node scripts/refresh-book.mjs           (or: pnpm book:refresh)
 *
 * Honours the same overrides as the capture script:
 *   $env:TOKEN="..."; $env:PROJECT="..."; $env:BASE_URL="..."
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const WIN = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: WIN, ...opts });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
    p.on('error', reject);
  });
}

async function main() {
  // 1) Capture figures (inherits TOKEN/PROJECT/BASE_URL from the shell)
  console.log('\n=== 1/2 · Capturing figures ===');
  await run('node', ['scripts/capture-figures.mjs']);

  // 2) Rebuild chapter .docx from .md
  console.log('\n=== 2/2 · Rebuilding chapter .docx (pandoc) ===');
  const hasPandoc = spawnSync('pandoc', ['--version'], { shell: WIN }).status === 0;
  if (!hasPandoc) {
    console.log('  pandoc not found — figures ARE captured, but .docx was not rebuilt.');
    console.log('  Install it once (you already use Scoop):  scoop install pandoc');
    console.log('  …then re-run this script.');
    return;
  }

  const mdFiles = (await readdir('docs')).filter((f) => f.endsWith('.md'));
  let ok = 0, failed = 0;
  for (const md of mdFiles) {
    const docx = md.replace(/\.md$/, '.docx');
    process.stdout.write(`  ${md} -> ${docx} ... `);
    try {
      await run('pandoc', [md, '-o', docx], { cwd: 'docs' });
      console.log('ok'); ok++;
    } catch (e) {
      console.log('FAILED (is it open in Word? close it and re-run)'); failed++;
    }
  }
  console.log(`\nDone. Figures refreshed; ${ok} .docx rebuilt${failed ? `, ${failed} failed` : ''}.`);
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
