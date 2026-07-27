/**
 * User-management dashboard (admin-only).
 *
 * Lists every role row joined with its Supabase Auth user (email + last
 * sign-in). Emails live in auth.users, which the normal client can't read, so
 * this page pulls them via the service-role admin API — hence requireAdmin()
 * gates it and the whole page is server-rendered.
 */
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { ROLE_TYPES, ROLE_SHORT_LABELS } from '@/lib/roles';
import { createUser, setRole, setDisabled } from './actions';

export const metadata = { title: 'Users · AI PMO' };

interface RoleRow {
  id: string;
  name: string;
  username: string | null;
  role_type: string;
  user_id: string | null;
  is_admin: boolean;
  disabled: boolean;
  must_change_password: boolean;
}

const AVATAR_CLASSES = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

function avatarClass(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_CLASSES[h % AVATAR_CLASSES.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const s = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return s.toUpperCase() || '?';
}

function StatTile({ label, value, tile, dot }: { label: string; value: number; tile: string; dot: string }) {
  return (
    <div className={'rounded-xl border p-4 ' + tile}>
      <div className="flex items-center gap-2">
        <span className={'h-2 w-2 rounded-full ' + dot} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
    </div>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdmin();
  const { error, ok } = await searchParams;

  const admin = createSupabaseServiceClient();

  const { data: rolesData } = await admin
    .from('roles')
    .select('id, name, username, role_type, user_id, is_admin, disabled, must_change_password')
    .order('is_admin', { ascending: false })
    .order('role_type');
  const roles = (rolesData ?? []) as RoleRow[];

  const authById = new Map<string, { email: string; lastSignIn: string | null }>();
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    for (const u of users) {
      authById.set(u.id, { email: u.email ?? '', lastSignIn: u.last_sign_in_at ?? null });
    }
    if (users.length < 200) break;
  }

  const rows = roles.map((r) => {
    const au = r.user_id ? authById.get(r.user_id) : undefined;
    return {
      ...r,
      email: r.user_id ? au?.email ?? '—' : '(no login yet)',
      lastSignIn: au?.lastSignIn ?? null,
    };
  });

  const total = rows.length;
  const disabledCount = rows.filter((r) => r.disabled).length;
  const adminCount = rows.filter((r) => r.is_admin).length;
  const activeCount = total - disabledCount;

  return (
    <div className="container mx-auto max-w-6xl px-6 py-10">
      {/* Header band */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 via-background to-violet-50 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create colleague accounts, assign roles, and enable or disable access.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total users" value={total} tile="border-indigo-200 bg-indigo-50" dot="bg-indigo-500" />
          <StatTile label="Active" value={activeCount} tile="border-emerald-200 bg-emerald-50" dot="bg-emerald-500" />
          <StatTile label="Disabled" value={disabledCount} tile="border-rose-200 bg-rose-50" dot="bg-rose-500" />
          <StatTile label="Admins" value={adminCount} tile="border-violet-200 bg-violet-50" dot="bg-violet-500" />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {ok ? (
        <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
      ) : null}

      {/* Add user */}
      <section className="mt-6 rounded-xl border bg-background p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-sm leading-none text-background">+</span>
          Add a user
        </h2>
        <form action={createUser} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <input name="first_name" required placeholder="First name" className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3" />
          <input name="last_name" required placeholder="Last name" className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3" />
          <input name="username" required placeholder="Login ID" autoCapitalize="none" spellCheck={false} className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3" />
          <input name="email" type="email" required placeholder="email@company.com" className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3" />
          <select name="role_type" required defaultValue="" className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3">
            <option value="" disabled>Role…</option>
            {ROLE_TYPES.map((rt) => (
              <option key={rt} value={rt}>{ROLE_SHORT_LABELS[rt]}</option>
            ))}
          </select>
          <input name="password" type="text" required minLength={8} placeholder="Initial password" className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-3" />
          <button type="submit" className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 sm:col-span-3">Create user</button>
        </form>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Users sign in with their <span className="font-medium text-foreground">Login ID</span>; the email is kept behind the scenes.
          The initial password must be changed on first sign-in. Choosing “Administrator” grants user-management access only.
        </p>
      </section>

      {/* Table */}
      <div className="mt-8 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Login ID</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className={'transition hover:bg-muted/40 ' + (r.disabled ? 'bg-rose-50/40' : '')}>
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <span className={'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' + avatarClass(r.id)}>
                      {initials(r.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{r.name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {r.is_admin ? (
                          <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-200">Admin</span>
                        ) : null}
                        {r.must_change_password ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">must set password</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{r.username ?? '—'}</span>
                </td>
                <td className="px-4 py-3 align-middle text-muted-foreground">{r.email}</td>
                <td className="px-4 py-3 align-middle">
                  <form action={setRole} className="flex items-center gap-2">
                    <input type="hidden" name="role_id" value={r.id} />
                    <input type="hidden" name="user_id" value={r.user_id ?? ''} />
                    <select name="role_type" defaultValue={r.role_type} className="rounded-md border bg-background px-2 py-1 text-xs">
                      {ROLE_TYPES.map((rt) => (
                        <option key={rt} value={rt}>{ROLE_SHORT_LABELS[rt]}</option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-md border px-2 py-1 text-xs transition hover:bg-muted">Save</button>
                  </form>
                </td>
                <td className="px-4 py-3 align-middle">
                  <form action={setDisabled} className="flex items-center gap-2.5">
                    <input type="hidden" name="role_id" value={r.id} />
                    <input type="hidden" name="user_id" value={r.user_id ?? ''} />
                    <input type="hidden" name="disabled" value={r.disabled ? 'false' : 'true'} />
                    {r.disabled ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    )}
                    <button type="submit" className="rounded-md border px-2 py-1 text-xs transition hover:bg-muted">
                      {r.disabled ? 'Enable' : 'Disable'}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 align-middle text-xs text-muted-foreground">
                  {r.lastSignIn ? r.lastSignIn.slice(0, 16).replace('T', ' ') : 'never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
