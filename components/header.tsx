'use client';

/**
 * Authentication-aware app header.
 *
 * Shown on every page under /access/[token]/. Three zones:
 *   left   — brand mark (logo + product name)
 *   center — the colleague's name + role
 *   right  — nav: "+ New project", a "Learn" dropdown grouping the education
 *            pages (About / Architecture / PMBOK / Agents / Concepts), then the
 *            operational links (Integration / Usage / Analytics).
 *
 * The Learn menu is a CSS-only dropdown (shows on hover and on keyboard
 * focus-within) so this stays a server component. It makes the explainer pages
 * reachable from anywhere, not just the welcome gateway.
 *
 * "+ New project" only shows for roles that can create one (pm + engineering_manager).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ResolvedRole } from '@/lib/role-context';
import { signOut } from '@/app/login/actions';

const CREATE_ROLES = ['pm', 'engineering_manager'];

const LEARN_LINKS: Array<{ path: string; label: string }> = [
  { path: 'learn', label: 'Learn home' },
  { path: 'about', label: 'How it works' },
  { path: 'architecture', label: 'Architecture' },
  { path: 'framework', label: 'PMBOK coverage' },
  { path: 'agents', label: 'The 15 agents' },
  { path: 'concepts', label: 'AI concepts' },
  { path: 'learn/training', label: 'Training' },
  { path: 'technical', label: 'Technical notes' },
];

export function Header({ token, resolved, signedIn = false }: { token: string; resolved: ResolvedRole; signedIn?: boolean }) {
  const canCreate = CREATE_ROLES.includes(resolved.role.role_type);
  // On the welcome gateway (its own branding + entry buttons) the full header is
  // redundant — keep only a minimal, centred name / role so you still see who
  // you're signed in as.
  if (/\/welcome$/.test(usePathname() ?? '')) {
    return (
      <header className="no-print">
        <div className="container mx-auto flex h-12 max-w-screen-2xl items-center justify-center px-8 leading-tight">
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-foreground">{resolved.role.name}</span>
            <span className="text-[11px] text-muted-foreground">{resolved.definition.display_name}</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="no-print border-b bg-background">
      <div className="container mx-auto grid h-14 max-w-screen-2xl grid-cols-[1fr_auto_1fr] items-center px-8">
        {/* Left — brand */}
        <Link
          href={`/dashboard`}
          className="inline-flex items-center gap-2.5 justify-self-start transition hover:opacity-90"
        >
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-base leading-none"
            style={{ color: '#FBBF24' }}
          >
            ✨
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight text-foreground">AI PMO</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              for Project Management Office
            </span>
          </span>
        </Link>

        {/* Center — who you are */}
        <div className="flex flex-col items-center justify-self-center leading-tight">
          <span className="text-sm font-semibold text-foreground">{resolved.role.name}</span>
          <span className="text-[11px] text-muted-foreground">{resolved.definition.display_name}</span>
        </div>

        {/* Right — nav */}
        <div className="flex items-center gap-4 justify-self-end text-sm">
          {canCreate && (
            <Link
              href={`/intake`}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition hover:opacity-90"
            >
              + New project
            </Link>
          )}

          {/* Learn — CSS-only dropdown grouping the education pages.
              group-hover keeps it open over the button AND the (descendant)
              menu; the transparent pt-1.5 bridge removes the dead zone so the
              menu never closes between them. focus-within handles keyboard/touch. */}
          <div className="group relative">
            <button
              type="button"
              aria-haspopup="true"
              className="inline-flex items-center gap-1 text-muted-foreground transition hover:text-foreground group-focus-within:text-foreground focus:outline-none"
            >
              Learn
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="opacity-70 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="invisible absolute right-0 top-full z-50 pt-1.5 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="w-52 rounded-lg border bg-background py-1.5 shadow-lg">
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Learn about AI PMO</p>
                {LEARN_LINKS.map((l) => (
                  <Link
                    key={l.path}
                    href={`/${l.path}`}
                    className="block px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-muted hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link href={`/integration`} className="text-muted-foreground transition hover:text-foreground">Integration</Link>
          <Link href={`/usage`} className="text-muted-foreground transition hover:text-foreground">Usage</Link>
          <Link href={`/analytics/actions`} className="text-muted-foreground transition hover:text-foreground">Analytics</Link>

          {signedIn ? (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
