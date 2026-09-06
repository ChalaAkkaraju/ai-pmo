/**
 * Sign-in page. Invite-only: there is no sign-up link — accounts are created by
 * an admin. Users sign in with their USERNAME; the server action resolves it to
 * the account's email behind the scenes. On success it redirects by role.
 */
import { signIn } from './actions';

export const metadata = { title: 'Sign in · AI PMO' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="container mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-20">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-base leading-none" style={{ color: '#FBBF24' }}>✨</span>
        <span className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight text-foreground">AI PMO</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">for Project Management Office</span>
        </span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Use the Login ID and password provided by your AI PMO owner.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <form action={signIn} className="mt-6 space-y-4">
        {/* Empty when no destination was requested — the server then sends each role to its own home. */}
        <input type="hidden" name="next" value={next ?? ''} />

        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-sm font-medium text-foreground">Login ID</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <button type="submit" className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90">Sign in</button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        No account? Access is by invitation — contact the AI PMO owner.
      </p>
    </main>
  );
}
