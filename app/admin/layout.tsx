/**
 * Admin area layout. Gated to admins only — requireAdmin() redirects
 * unauthenticated users to /login and non-admins to their dashboard. Provides
 * minimal chrome with a sign-out control.
 */
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '@/app/login/actions';

export const metadata = { title: 'User administration · AI PMO' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-14 max-w-screen-lg items-center justify-between px-6">
          <Link href="/admin/users" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-base leading-none" style={{ color: '#FBBF24' }}>✨</span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-foreground">AI PMO</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">User administration</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/users" className="text-muted-foreground transition hover:text-foreground">Users</Link>
            <Link href="/admin/learn" className="text-muted-foreground transition hover:text-foreground">Learn content</Link>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{role.name}</span>
            <form action={signOut}>
              <button type="submit" className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
