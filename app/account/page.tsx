/**
 * Protected account page — the milestone test target for the auth foundation.
 *
 * If this page renders your name/role after signing in (and redirects you to
 * /login when signed out), the whole chain works:
 *   login -> Supabase session cookie -> proxy refresh -> requireRole()
 *   -> roles.user_id link -> role definition.
 *
 * Once the full route migration (Phase 4) lands, this logic moves into the
 * authenticated (app) layout and this page can become a real profile page.
 */

import { requireRole } from '@/lib/auth';
import { signOut } from '@/app/login/actions';

export const metadata = { title: 'Account · AI PMO' };

export default async function AccountPage() {
  const { role, definition } = await requireRole();

  return (
    <main className="container mx-auto max-w-lg px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">You&rsquo;re signed in</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Authentication is working. Details resolved from your session:
      </p>

      <dl className="mt-6 divide-y rounded-lg border">
        <Row label="Name" value={role.name} />
        <Row label="Role" value={definition.display_name} />
        <Row label="Role type" value={role.role_type} />
        <Row label="Can write" value={definition.can_write ? 'Yes' : 'Read-only'} />
        <Row label="Agents available" value={String(definition.allowed_agents.length)} />
      </dl>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="rounded-md border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
