/**
 * Forced first-login password change. Users created by an admin land here and
 * can't reach the rest of the app (the proxy enforces it) until they set their
 * own password.
 */
import { redirect } from 'next/navigation';
import { getSessionRole } from '@/lib/auth';
import { changePassword } from './actions';

export const metadata = { title: 'Set your password · AI PMO' };

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolved = await getSessionRole();
  if (!resolved) redirect('/login');
  if (!resolved.role.must_change_password) {
    redirect(resolved.role.is_admin ? '/admin/users' : '/dashboard');
  }
  const { error } = await searchParams;

  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-20">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-base leading-none" style={{ color: '#FBBF24' }}>✨</span>
        <span className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight text-foreground">AI PMO</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">for Project Management Office</span>
        </span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Set your password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Welcome, {resolved.role.name}. Choose a new password to finish setting up your account.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <form action={changePassword} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="block text-sm font-medium text-foreground">Confirm new password</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20" />
        </div>
        <button type="submit" className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90">Set password</button>
      </form>
    </main>
  );
}
