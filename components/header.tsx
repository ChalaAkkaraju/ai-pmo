/**
 * Authentication-aware app header.
 *
 * Shown on every page under /access/[token]/. Displays the brand mark,
 * the colleague's name, and their role.
 */

import Link from 'next/link';
import type { ResolvedRole } from '@/lib/role-context';

export function Header({ token, resolved }: { token: string; resolved: ResolvedRole }) {
  return (
    <header className="no-print border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link
          href={`/access/${token}`}
          className="inline-flex items-center gap-2.5 transition hover:opacity-90"
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
        <div className="flex items-center gap-5 text-sm">
          <Link
            href={`/access/${token}/agents`}
            className="text-muted-foreground transition hover:text-foreground"
          >
            Agents
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-medium">{resolved.role.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{resolved.definition.display_name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
