'use client';

/**
 * Tabbed shell for the IT portfolio page. The tab is driven by the URL hash so
 * that links elsewhere on the page (#decisions, #holds, #rank-security …) open
 * the right tab and then scroll to the anchor.
 */

import { useEffect, useState, type ReactNode } from 'react';

export interface PortfolioTab { key: string; label: string; badge?: number; badgeTone?: 'teal' | 'amber'; content: ReactNode; /** hash prefixes that belong to this tab */ anchors?: string[] }

function tabForHash(tabs: PortfolioTab[], hash: string): string | null {
  const h = hash.replace(/^#/, '');
  if (!h) return null;
  for (const t of tabs) if (t.key === h || (t.anchors ?? []).some((a) => h === a || h.startsWith(`${a}-`))) return t.key;
  return null;
}

export function ItPortfolioTabs({ tabs, initial }: { tabs: PortfolioTab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0].key);
  useEffect(() => {
    const apply = () => {
      const k = tabForHash(tabs, window.location.hash);
      if (k) {
        setActive(k);
        const id = window.location.hash.slice(1);
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [tabs]);
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-8 border-b bg-background/95 px-8 backdrop-blur">
        <nav className="flex gap-1 overflow-x-auto" aria-label="IT portfolio sections">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => { setActive(t.key); history.replaceState(null, '', `#${t.key}`); }}
              className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${active === t.key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
              {t.badge != null && t.badge > 0 && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.badgeTone === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-teal-600 text-white'}`}>{t.badge}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-6">
        {tabs.map((t) => <div key={t.key} hidden={active !== t.key} className="space-y-6">{t.content}</div>)}
      </div>
    </div>
  );
}
