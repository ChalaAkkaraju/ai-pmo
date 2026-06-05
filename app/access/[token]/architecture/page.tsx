/**
 * Architecture explainer page — the overall picture for anyone who wants the
 * deeper view behind the welcome page. Renders the end-to-end lifecycle swim
 * lane (served from /public) with a short reading key and cross-links. This is
 * an education surface; no role gating beyond a valid token.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { ProcessFlowDiagram } from '@/components/process-flow-diagram';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

const KEY = [
  { c: '#B5D4F4', t: 'SAP PS — ERP', d: 'System of record for cost, structure, change, revenue' },
  { c: '#FAC775', t: 'Scheduler', d: 'System of record for tasks, dates, progress, resources' },
  { c: '#97C459', t: 'AI PMO', d: 'Reads both, authors the WBS — one write, else read-only' },
  { c: '#D3D1C7', t: 'CRM / CPQ', d: 'Out of integration scope; as-sold baseline crosses at booking' },
];

export default async function ArchitecturePage({ params }: PageProps) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-xl px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/access/${token}`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/access/${token}/welcome`} className="hover:underline">Welcome</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Architecture</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">How AI PMO fits — the architecture</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The layer sits above the ERP and the scheduler across the whole project lifecycle. It reads both systems of
        record and writes exactly once — authoring the WBS and booking it into the ERP at setup, then publishing that
        WBS to the scheduler so every task is born tagged. Everything after that is read-only synthesis, joined by the
        WBS code, ending in the three-state margin reconciliation.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ai-pmo-swimlane.svg"
          alt="End-to-end lifecycle swim lane across CRM/CPQ, SAP PS, AI PMO and the scheduler, showing the AI authoring and booking the WBS into SAP and SAP publishing the WBS to the scheduler."
          className="mx-auto block min-w-[940px] max-w-full"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KEY.map((k) => (
          <div key={k.t} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: k.c }} />
              <p className="text-sm font-semibold">{k.t}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{k.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Reading the two arrows</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          <span className="font-medium text-emerald-700">▲ book (1 write)</span> — AI PMO authors the WBS and books the
          approved version up into SAP at setup. <span className="font-medium text-sky-700">▼ publish WBS</span> — SAP then
          publishes the WBS structure (code + hierarchy only, no cost or dates) down to the scheduler, where planners build
          WBS-tagged activities. The schedule itself — durations, dependencies, critical path, resources — stays with the
          planner and the scheduler.
        </p>
      </div>

      <h2 className="mt-12 text-xl font-bold tracking-tight">End-to-end process — from booking</h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The same lifecycle as a step-by-step process flow. It begins at commercial booking (the as-sold baseline crosses
        from CRM/CPQ), the AI authors and books the WBS, then execution runs in parallel across SAP PS (cost) and the
        scheduler (progress) before merging on the WBS code for synthesis &mdash; looping each reporting cycle until closeout.
      </p>
      <div className="mt-4">
        <ProcessFlowDiagram token={token} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/access/${token}/framework`} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">See the PMBOK coverage →</Link>
        <Link href={`/access/${token}/agents`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">The 14 agents →</Link>
        <Link href={`/access/${token}`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">Back to portfolio</Link>
      </div>
    </div>
  );
}
