/**
 * Authentication-aware app header.
 *
 * Shown on every page under /access/[token]/. Three zones:
 *   left   — brand mark (logo + product name)
 *   center — the colleague's name + role
 *   right  — nav links (Agents / Usage / Analytics)
 */

import Link from 'next/link';
import type { ResolvedRole } from '@/lib/role-context';

export function Header({ token, resolved }: { token: string; resolved: ResolvedRole }) {
  return (
    <header className="no-print border-b bg-background">
      <div className="container mx-auto grid h-14 grid-cols-[1fr_auto_1fr] items-center px-6">
        {/* Left — brand */}
        <Link
          href={`/access/${token}`}
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
        <div className="flex items-center gap-5 justify-self-end text-sm">
          <Link
            href={`/access/${token}/agents`}
            className="text-muted-foreground transition hover:text-foreground"
          >
            Agents
          </Link>
          <Link
            href={`/access/${token}/usage`}
            className="text-muted-foreground transition hover:text-foreground"
          >
            Usage
          </Link>
          <Link
            href={`/access/${token}/analytics/actions`}
            className="text-muted-foreground transition hover:text-foreground"
          >
            Analytics
          </Link>
        </div>
      </div>
    </header>
  );
}
