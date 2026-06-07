'use client';

/**
 * Shared rich agent card — the scope-tinted hero, lifecycle stepper, does /
 * doesn't cards, a "try asking" callout and the methodology footer. Rendered
 * inside a modal by both the /architecture process flow and the /framework
 * PMBOK matrix so the two stay identical. Caller owns the modal shell
 * (overlay, close button, scroll); this renders the padded body only.
 */

import { Fragment } from 'react';
import Link from 'next/link';
import {
  FileText, Users, ListTree, Calendar, DollarSign, MessageSquare, ClipboardList,
  TrendingUp, GitPullRequest, ShieldAlert, Lightbulb, FileCheck, LayoutGrid,
  Check, X, MessageCircle, Newspaper, type LucideIcon,
} from 'lucide-react';
import { AGENT_CATALOG, type AgentScope } from '@/lib/agent-catalog';
import type { AgentType } from '@/lib/types';

function scopeStyle(scope: AgentScope): { label: string; chip: string; accent: string } {
  switch (scope) {
    case 'project': return { label: 'Project-level', chip: 'bg-emerald-100 text-emerald-800', accent: '#10b981' };
    case 'portfolio': return { label: 'Portfolio-level', chip: 'bg-violet-100 text-violet-800', accent: '#8b5cf6' };
    case 'single-item': return { label: 'Single-item', chip: 'bg-sky-100 text-sky-800', accent: '#0ea5e9' };
  }
}

export const AGENT_ICON: Record<AgentType, LucideIcon> = {
  charter_drafter: FileText, stakeholder_analyst: Users, wbs_builder: ListTree,
  schedule_reasoner: Calendar, budget_builder: DollarSign, communications_planner: MessageSquare,
  issue_logger: ClipboardList, variance_analyst: TrendingUp, change_order_reviewer: GitPullRequest,
  risk_analyst: ShieldAlert, lessons_learned_synthesiser: Lightbulb, closeout_reporter: FileCheck,
  portfolio_risk_reviewer: LayoutGrid,
  status_reporter: Newspaper,
};

const PHASES = ['Initiation', 'Planning', 'Execution', 'Monitoring', 'Closeout'] as const;
type Phase = (typeof PHASES)[number];

const AGENT_PHASE: Record<AgentType, Phase | 'portfolio'> = {
  charter_drafter: 'Initiation', stakeholder_analyst: 'Initiation', wbs_builder: 'Planning',
  schedule_reasoner: 'Planning', budget_builder: 'Planning', communications_planner: 'Planning',
  issue_logger: 'Execution', variance_analyst: 'Monitoring', change_order_reviewer: 'Monitoring',
  risk_analyst: 'Monitoring', lessons_learned_synthesiser: 'Closeout', closeout_reporter: 'Closeout',
  portfolio_risk_reviewer: 'portfolio',
  status_reporter: 'Monitoring',
};

function LifecycleStepper({ phase }: { phase: Phase | 'portfolio' }) {
  const isPortfolio = phase === 'portfolio';
  const activeIdx = isPortfolio ? -1 : PHASES.indexOf(phase);
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where in the project lifecycle</p>
      <div className="mt-2 flex flex-wrap items-center">
        {PHASES.map((p, i) => {
          const isActive = isPortfolio || i === activeIdx;
          return (
            <Fragment key={p}>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>{p}</span>
              {i < PHASES.length - 1 && <span className="mx-1 h-px w-4 flex-none bg-border" aria-hidden />}
            </Fragment>
          );
        })}
      </div>
      {isPortfolio && <p className="mt-2 text-xs text-muted-foreground">Spans every phase — operates across the whole portfolio.</p>}
    </div>
  );
}

export function AgentDetailCard({ agentType, token }: { agentType: AgentType; token: string }) {
  const entry = AGENT_CATALOG.find((a) => a.agent_type === agentType);
  if (!entry) return null;
  const s = scopeStyle(entry.scope);
  const Icon = AGENT_ICON[entry.agent_type] ?? FileText;

  return (
    <>
      <div className="rounded-2xl border p-5" style={{ background: `linear-gradient(135deg, ${s.accent}1f, ${s.accent}08)`, borderColor: `${s.accent}33` }}>
        <div className="mb-2.5 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl" style={{ backgroundColor: `${s.accent}26`, color: s.accent }}>
            <Icon size={24} strokeWidth={2} />
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${s.chip}`}>{s.label}</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">{entry.name}</h2>
        <p className="mt-1 text-sm text-foreground/70">{entry.purpose}</p>
      </div>

      <p className="mt-4 text-base leading-relaxed text-foreground/80">{entry.plain}</p>

      <LifecycleStepper phase={AGENT_PHASE[entry.agent_type]} />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Does well</p>
          <ul className="mt-2.5 space-y-1.5">
            {entry.does.map((d, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground/85"><Check size={17} strokeWidth={2.5} className="mt-0.5 flex-none text-emerald-500" /><span>{d}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">Doesn&apos;t do</p>
          <ul className="mt-2.5 space-y-1.5">
            {entry.doesNot.map((d, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground/85"><X size={17} strokeWidth={2.5} className="mt-0.5 flex-none text-rose-400" /><span>{d}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border-l-4 border-sky-400 bg-sky-50/60 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sky-700"><MessageCircle size={16} strokeWidth={2.5} />Try asking</p>
        <p className="mt-1.5 text-base italic leading-relaxed text-foreground/85">&ldquo;{entry.samplePrompt}&rdquo;</p>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-foreground/60">Based on: </span>{entry.methodology}
      </p>

      <div className="mt-4 border-t pt-3 text-right">
        <Link href={`/access/${token}/agents`} className="text-xs font-medium text-foreground hover:underline">See all 14 agents →</Link>
      </div>
    </>
  );
}
