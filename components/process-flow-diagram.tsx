'use client';

/**
 * Interactive end-to-end process flow. Renders the standalone SVG inline (so the
 * agent boxes, tagged with data-agent, become clickable) and opens a popup with
 * that agent's catalog entry — name, what it does and doesn't, methodology and a
 * sample prompt — so a viewer can understand each of the 13 specialists in place.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AGENT_CATALOG } from '@/lib/agent-catalog';

export function ProcessFlowDiagram({ token }: { token: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState('');
  const [agent, setAgent] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch('/ai-pmo-process-flow.svg')
      .then((r) => r.text())
      .then((t) => { if (on) setSvg(t); })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || !svg) return;
    const handler = (e: Event) => {
      const t = e.target as Element | null;
      const el = t && typeof t.closest === 'function' ? t.closest('[data-agent]') : null;
      const id = el?.getAttribute('data-agent');
      if (id) setAgent(id);
    };
    node.addEventListener('click', handler);
    return () => node.removeEventListener('click', handler);
  }, [svg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAgent(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const entry = AGENT_CATALOG.find((a) => a.agent_type === agent) ?? null;

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">Tip: click any green agent box to see what that agent does.</p>
      <div className="overflow-x-auto rounded-xl border bg-card p-4">
        {svg ? (
          <div ref={ref} className="mx-auto min-w-[760px] max-w-[820px]" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">Loading diagram…</div>
        )}
      </div>

      {entry && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={() => setAgent(null)}>
          <div className="mt-8 w-full max-w-lg rounded-xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-[13px] text-emerald-700" aria-hidden="true">⚙</span>
                  <p className="text-sm font-semibold">{entry.name}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{entry.scope}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{entry.purpose}</p>
              </div>
              <button type="button" onClick={() => setAgent(null)} className="rounded-md px-2 py-0.5 text-sm text-muted-foreground hover:bg-muted" aria-label="Close">&times;</button>
            </div>
            <div className="space-y-3 px-5 py-4 text-[13px]">
              <p className="leading-relaxed text-muted-foreground">{entry.plain}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Does</p>
                  <ul className="mt-1 space-y-1">
                    {entry.does.map((d) => (
                      <li key={d} className="flex gap-1.5"><span className="mt-px text-emerald-600">✓</span><span>{d}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Doesn&apos;t</p>
                  <ul className="mt-1 space-y-1">
                    {entry.doesNot.map((d) => (
                      <li key={d} className="flex gap-1.5 text-muted-foreground"><span className="mt-px text-muted-foreground/60">✕</span><span>{d}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Method:</span> {entry.methodology}</p>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs"><span className="font-medium">Try:</span> &ldquo;{entry.samplePrompt}&rdquo;</div>
            </div>
            <div className="border-t px-5 py-2.5 text-right">
              <Link href={`/access/${token}/agents`} className="text-xs font-medium text-foreground hover:underline">See all 13 agents →</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
