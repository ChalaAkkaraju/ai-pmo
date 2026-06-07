'use client';

/**
 * Sub-navigation for the three analytics pages. Highlights the active tab based
 * on the current path. Lives as a client component only for the active-state
 * detection; the pages themselves are server-rendered.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: Array<{ slug: string; label: string }> = [
  { slug: 'actions', label: 'Cross-agent actions' },
  { slug: 'issues', label: 'Issues' },
  { slug: 'risks', label: 'Risks' },
  { slug: 'earned-value', label: 'Earned value' },
  { slug: 'resources', label: 'Resources' },
];

export function AnalyticsNav({ token }: { token: string }) {
  const pathname = usePathname() ?? '';
  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {TABS.map((t) => {
        const href = `/access/${token}/analytics/${t.slug}`;
        const active = pathname.endsWith(`/analytics/${t.slug}`);
        return (
          <Link
            key={t.slug}
            href={href}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />}
          </Link>
        );
      })}
    </nav>
  );
}
