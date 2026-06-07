/**
 * One-command deep-fill: picks the 10 showcase projects, then runs the 5
 * remaining planning agents over them (50 Opus calls, ~$7.80; capped at $9).
 *
 * Run from the project root:  npx tsx scripts/generators/deep-fill-all.ts
 */
import { execSync } from 'node:child_process';

console.log('Picking 10 deep-fill projects...');
const out = execSync('npx tsx scripts/generators/pick-deep-fill-projects.ts', { encoding: 'utf8' });
process.stdout.write(out);

// The picker prints the chosen codes as one comma-separated line.
const codesLine = out
  .split('\n')
  .map((s) => s.trim())
  .find((s) => /^[A-Z]{2,}-[A-Z]{2,}-\d+(,[A-Z]{2,}-[A-Z]{2,}-\d+)+$/.test(s));

if (!codesLine) {
  console.error('\nCould not find the codes line in the picker output. Run the picker manually and pass --codes to 05.');
  process.exit(1);
}

console.log(`\nDeep-filling: ${codesLine}\n`);
try {
  execSync(`npx tsx scripts/generators/05-bulk-deep-fill.ts --codes ${codesLine} --cost-cap 9`, { stdio: 'inherit' });
} catch {
  console.error('\nDeep-fill stopped (see error above). It is idempotent — safe to re-run.');
  process.exit(1);
}
console.log('\n✅ Deep-fill complete.');
