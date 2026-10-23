/**
 * Reset one demo account's password on the LOCAL Supabase only.
 *
 * Use when a local demo login no longer works because the password was
 * changed on the first-sign-in "change password" page. seed:users never
 * overwrites passwords of accounts that are already linked.
 *
 * Run:  pnpm tsx scripts/dev/reset-password.ts admin@demo.aipmo.local
 *       pnpm tsx scripts/dev/reset-password.ts admin@demo.aipmo.local MyNewPass1
 * Default new password: AIPMO2026. Refuses to run against a non-local database.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getServiceClient } from '../lib/supabase-admin';

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  const password = process.argv[3] ?? 'AIPMO2026';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  if (!email) {
    console.error('Usage: pnpm tsx scripts/dev/reset-password.ts <email> [new-password]');
    process.exit(1);
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    console.error(`Refusing: .env.local points at ${url || '(no URL)'}, not the local Supabase.`);
    process.exit(1);
  }

  const admin = getServiceClient();
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => (u.email ?? '').toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!userId) {
    console.error(`No local account found for ${email}.`);
    process.exit(1);
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    app_metadata: { must_change_password: false },
  });
  if (error) throw error;
  await admin.from('roles').update({ must_change_password: false }).eq('user_id', userId);

  console.log(`Password reset for ${email}. Sign in at http://localhost:3000/login`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
