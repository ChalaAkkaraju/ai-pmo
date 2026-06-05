'use client';

/**
 * Interactive end-to-end process flow. Renders the standalone SVG inline (agent
 * boxes carry data-agent) and, on click, opens a popup with the shared rich
 * agent card (AgentDetailCard) — the same card used on the /agents deck and the
 * /framework matrix.
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AGENT_CATALOG } from '@/lib/agent-catalog';
import type { AgentType } from '@/lib/types';
import { AgentDetailCard } from '@/components/agent-detail-card';

export function ProcessFlowDiagram({ token }: { token: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState('');
  const [agent, setAgent] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch('/ai-pmo-process-flow.svg').then((r) => r.text()).then((t) => { if (on) setSvg(t); }).catch(() => {});
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

  const valid = agent ? AGENT_CATALOG.some((a) => a.agent_type === agent) : false;

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

      {agent && valid && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={() => setAgent(null)}>
          <div className="relative my-4 w-full max-w-4xl rounded-2xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setAgent(null)} aria-label="Close" className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X size={16} strokeWidth={2.5} />
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-5">
              <AgentDetailCard agentType={agent as AgentType} token={token} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
