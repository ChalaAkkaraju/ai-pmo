'use client';

/**
 * Workspace launcher on the welcome page: one card per PMO. The whole card is
 * the button. Each card states the one question that workspace answers, what
 * you will see there, and what it is measured on.
 *
 * For the demo switcher account a card switches to that workspace's lead role
 * on this address and opens its home; for everyone else it is a plain link to
 * a workspace their role can already see.
 */

import { useEffect, useState } from 'react';
import { Building2, Briefcase, Cpu, FlaskConical, Factory, Check, type LucideIcon } from 'lucide-react';

export interface LaunchCard {
  key: 'enterprise' | 'revenue' | 'it' | 'rnd' | 'capital';
  title: string;
  /** The one question this workspace answers. */
  question: string;
  /** What you will see there — two or three short lines. */
  highlights: string[];
  /** What it is measured on — short chips. */
  measures: string[];
  /** Role to switch to (switcher only); 'self' = your own role. */
  roleId: string | null;
  href: string;
}

const STYLE: Record<LaunchCard['key'], { hex: string; soft: string; Icon: LucideIcon }> = {
  enterprise: { hex: '#0f172a', soft: '#f1f5f9', Icon: Building2 },
  revenue: { hex: '#2563eb', soft: '#eff6ff', Icon: Briefcase },
  it: { hex: '#0d9488', soft: '#f0fdfa', Icon: Cpu },
  rnd: { hex: '#7c3aed', soft: '#f5f3ff', Icon: FlaskConical },
  capital: { hex: '#d97706', soft: '#fffbeb', Icon: Factory },
};

export function WorkspaceLauncher({ cards, canSwitch, onSelect }: { cards: LaunchCard[]; canSwitch: boolean; /** Signed-out page: open the sign-in pop-up instead of navigating. */ onSelect?: (c: LaunchCard) => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  // Coming back with the browser's Back button restores this page from the
  // back/forward cache with a card still "Opening…" — clear that so the next
  // card works without a refresh.
  useEffect(() => {
    const reset = () => setBusy(null);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  async function open(c: LaunchCard) {
    if (onSelect) { onSelect(c); return; }
    setBusy(c.key);
    try { sessionStorage.setItem('pmo-welcome-seen', '1'); } catch { /* ignore */ }
    if (canSwitch && c.roleId) {
      const res = await fetch('/api/role/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role_id: c.roleId }) });
      const j = await res.json().catch(() => ({}));
      window.location.href = res.ok ? (j.home ?? c.href) : c.href;
      return;
    }
    window.location.href = c.href;
  }

  return (
    <div className="mt-8 w-full max-w-6xl">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Choose a workspace</p>
      <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const s = STYLE[c.key];
          const opening = busy === c.key;
          return (
            <button key={c.key} type="button" onClick={() => open(c)} disabled={busy !== null} aria-label={`Open ${c.title}`}
              style={{ ['--accent' as string]: s.hex }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait">
              {/* colour band + soft wash that deepens on hover */}
              <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: s.hex }} />
              <span className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60 transition-opacity group-hover:opacity-100" style={{ background: `linear-gradient(180deg, ${s.soft}, transparent)` }} />

              <span className="relative flex items-center gap-2.5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: s.hex }}>
                  <s.Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="text-[16px] font-bold leading-tight" style={{ color: s.hex }}>{c.title}</span>
              </span>

              <p className="relative mt-3.5 text-[14px] font-semibold leading-snug text-foreground">{c.question}</p>

              <ul className="relative mt-3 space-y-1.5">
                {c.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
                    <Check className="mt-[2px] h-3.5 w-3.5 shrink-0" style={{ color: s.hex }} strokeWidth={2.5} />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="relative mt-auto flex flex-wrap gap-1.5 pt-4">
                {c.measures.map((m) => (
                  <span key={m} className="rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ backgroundColor: s.soft, color: s.hex }}>{m}</span>
                ))}
              </div>

              {opening && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-semibold backdrop-blur-[1px]" style={{ color: s.hex }}>
                  Opening…
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
