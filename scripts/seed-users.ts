/**
 * Invite-only account seeding.
 *
 * Creates one Supabase Auth user (email + password) for each row in the `roles`
 * table and links it via roles.user_id. This is the invite/admin-seeded model:
 * there is no public sign-up — accounts exist only because this script (or a
 * future admin action) created them.
 *
 * Credentials are read from `users.seed.json` (git-ignored). Copy the template:
 *     cp users.seed.example.json users.seed.json
 * then edit the emails/passwords. The file is keyed by role_type.
 *
 * Idempotent:
 *   - roles rows that already have a user_id are skipped.
 *   - if an auth user with the target email already exists, it is reused
 *     (its password is reset to the configured value) and linked.
 *
 * Run with:  pnpm seed:users
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { config } from 'dotenv';
// Load .env.local explicitly (Next.js convention; dotenv defaults to .env).
config({ path: '.env.local' });

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getServiceClient } from './lib/supabase-admin';

interface SeedEntry {
  email: string;
  password: string;
}
type SeedConfig = Record<string, SeedEntry>; // keyed by role_type

interface RoleRow {
  id: string;
  name: string;
  role_type: string;
  user_id: string | null;
}

function loadSeedConfig(): SeedConfig {
  const path = resolve(process.cwd(), 'users.seed.json');
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SeedConfig;
  } catch {
    throw new Error(
      'Missing users.seed.json. Copy the template and fill in credentials:\n' +
        '    cp users.seed.example.json users.seed.json\n' +
        '(users.seed.json is git-ignored — real passwords never get committed.)',
    );
  }
}

/** Find an existing auth user by email by paging through the admin list. */
async function findUserByEmail(
  admin: ReturnType<typeof getServiceClient>,
  email: string,
): Promise<{ id: string } | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (hit) return { id: hit.id };
    if (data.users.length < 200) break; // last page
  }
  return null;
}

async function main() {
  const seed = loadSeedConfig();
  const admin = getServiceClient();

  const { data: roles, error } = await admin
    .from('roles')
    .select('id, name, role_type, user_id')
    .order('role_type');
  if (error) throw new Error(`Could not read roles: ${error.message}`);

  console.log(`\nAI PMO — seeding auth accounts for ${roles?.length ?? 0} roles\n`);

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const role of (roles ?? []) as RoleRow[]) {
    const label = `${role.role_type} (${role.name})`;

    if (role.user_id) {
      console.log(`  ✓ ${label} — already linked, skipping`);
      skipped++;
      continue;
    }

    const entry = seed[role.role_type];
    if (!entry?.email || !entry?.password) {
      console.warn(`  ! ${label} — no credentials in users.seed.json, skipping`);
      skipped++;
      continue;
    }

    // Create the auth user (pre-confirmed so no SMTP is needed for the demo).
    let userId: string | null = null;
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email: entry.email,
      password: entry.password,
      email_confirm: true,
      user_metadata: { role_id: role.id, name: role.name, role_type: role.role_type },
    });

    if (createErr) {
      // Most likely the user already exists — reuse and reset the password.
      const existing = await findUserByEmail(admin, entry.email);
      if (!existing) {
        console.error(`  ✗ ${label} — createUser failed: ${createErr.message}`);
        continue;
      }
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password: entry.password,
        email_confirm: true,
        user_metadata: { role_id: role.id, name: role.name, role_type: role.role_type },
      });
      console.log(`  ↻ ${label} — reused existing auth user`);
    } else {
      userId = createData.user.id;
      created++;
      console.log(`  + ${label} — created ${entry.email}`);
    }

    const { error: linkErr } = await admin
      .from('roles')
      .update({ user_id: userId })
      .eq('id', role.id);
    if (linkErr) {
      console.error(`  ✗ ${label} — link failed: ${linkErr.message}`);
      continue;
    }
    linked++;
  }

  console.log(
    `\nDone. created=${created} linked=${linked} skipped=${skipped}. ` +
      `Colleagues can now sign in at /login with their email + password.\n`,
  );
}

main().catch((err) => {
  console.error('\nseed-users failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
