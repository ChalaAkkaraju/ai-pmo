/**
 * Technical · Architecture & data model. Reference page — the two-layer
 * canonical model (consume mirror vs build), provenance, the booking flow.
 * Read from the migrations; valid token only.
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canViewLearnKey } from '@/lib/learn-content';
import { getSessionRole } from '@/lib/auth';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ token: string }>; }

const CONSUME: Array<{ table: string; holds: string; fed: string }> = [
  { table: 'projects', holds: 'Project header — name, code, client, contract value, approved budget, contingency, segment, status, as-sold baseline, contractual start/finish.', fed: 'SAP (shelled from the won quote at booking). Intake-form projects are app-native (APP) until booked.' },
  { table: 'work_packages', holds: 'The WBS — code, parent, name, budget (BAC), target finish, billing-element flag; authoring/booking state.', fed: 'AI-authored, then booked to SAP PS (the one upstream write).' },
  { table: 'cost_actuals', holds: 'Actual cost, commitment, planned value — per WBS, per period.', fed: 'SAP PS.' },
  { table: 'change_orders', holds: 'Change orders — driver, scope, cost/revenue/schedule impact, status, four-frame analysis.', fed: 'SAP PS (the ERP owns executed change financials).' },
  { table: 'tasks', holds: 'Schedule activities — start/finish, duration, % complete, predecessors, critical flag.', fed: 'Scheduler (Microsoft Project / Primavera P6).' },
  { table: 'milestones', holds: 'Schedule milestones — due/achieved dates, contractual flag.', fed: 'Scheduler (Microsoft Project / P6).' },
  { table: 'resource_assignments', holds: 'Resource loading — name, role, period, planned hours, allocation %.', fed: 'Scheduler (Microsoft Project / P6).' },
];

const BUILD: Array<{ table: string; holds: string; by: string }> = [
  { table: 'risks', holds: 'Risk register — category, probability/impact/score, response, owner, cross-cutting class, pattern link.', by: 'Risk Analyst / seeded' },
  { table: 'issues', holds: 'Issue log — description, category, severity, status, linked WBS/risk.', by: 'Issue Logger / seeded' },
  { table: 'variance_reports', holds: 'Per-week earned-value snapshot — CPI, SPI, variances, contingency consumed, projected margin, full report.', by: 'Computed / seeded' },
  { table: 'portfolio_patterns', holds: 'Cross-project patterns — class, status, evidence, threshold, supporting projects, recommended action.', by: 'Portfolio Risk Reviewer' },
  { table: 'action_items', holds: 'Cross-agent assign→respond loop — source risk/issue, assigned/raised-by role, status, urgency, response.', by: 'Agents + roles' },
  { table: 'agent_outputs', holds: 'Every agent invocation — prompt, input payload, output (+ human edits), tokens, cost, session, routing.', by: 'The AI layer' },
  { table: 'worked_examples', holds: 'Grounding library — historical artefacts + a pgvector embedding, used as style/structure anchors.', by: 'Seeded' },
  { table: 'roles', holds: 'Colleague roles — URL token, name, role type, allowed agents.', by: 'Seeded' },
  { table: 'project_drafts', holds: 'Saved intake-form drafts.', by: 'Intake form' },
  { table: 'sync_runs', holds: 'Ingestion-run log — source system, channel, status, row counts.', by: 'The sync engine' },
  { table: 'sync_exceptions', holds: 'Ingestion problems — unmapped WBS, validation, conflict, orphaned WBS.', by: 'The sync engine' },
];

export default async function DataModelPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();
  if (!(await canViewLearnKey('technical', resolved))) redirect('/dashboard');

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href={`/dashboard`} className="hover:underline">Portfolio</Link>
        <span className="mx-2">/</span>
        <Link href={`/technical`} className="hover:underline">Technical notes</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Data model</span>
      </nav>

            <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Architecture &amp; data model</h1>
        <PrintButton />
      </div>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The tables split into two layers. A <span className="font-medium text-foreground">consume layer</span> mirrors your
        systems of record — every row carries provenance (<code className="rounded bg-muted px-1 py-0.5 text-[12px]">source_system</code>,
        <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[12px]">external_id</code>,
        <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[12px]">synced_at</code>) — and a
        <span className="font-medium text-foreground"> build layer</span> holds the PMO content AI PMO creates, seeds or
        synthesises. Everything is joined by the <span className="font-medium text-foreground">WBS code</span>.
      </p>

      <div className="mt-5 rounded-xl border-l-4 border-sky-400 bg-sky-50/50 px-4 py-3">
        <p className="text-sm font-semibold text-sky-800">The booking flow</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/80">
          CPQ wins the deal → feeds SAP → SAP creates the <span className="font-medium">shell project</span> (header +
          as-sold baseline) and stays the system of record → AI PMO <span className="font-medium">mirrors</span> it → the
          AI authors the scope-true <span className="font-medium">WBS</span> → a human approves → it is booked back to SAP
          once → from then SAP (cost) and the scheduler (progress) feed AI PMO read-only. The WBS is AI PMO&rsquo;s one
          write into SAP; what it mirrors from the two systems stays read-only, while its own layer — risks, issues,
          actions, analyses — is born and owned in-app.
        </p>
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight">Consume layer — mirrored from systems of record</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Provenance-tagged. A real SAP/scheduler integration populates these.</p>
      <div className="mt-3 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead><tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2 font-semibold">Table</th><th className="px-3 py-2 font-semibold">What it holds</th><th className="px-3 py-2 font-semibold">Fed by</th></tr></thead>
          <tbody className="divide-y">
            {CONSUME.map((r) => (
              <tr key={r.table} className="align-top">
                <td className="px-3 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-[12px] font-medium">{r.table}</code></td>
                <td className="px-3 py-3 text-[13px] text-muted-foreground">{r.holds}</td>
                <td className="px-3 py-3 text-[13px] text-foreground/80">{r.fed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-bold tracking-tight">Build layer — populated within AI PMO</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">App-native — created, seeded, computed or synthesised by the layer.</p>
      <div className="mt-3 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead><tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2 font-semibold">Table</th><th className="px-3 py-2 font-semibold">What it holds</th><th className="px-3 py-2 font-semibold">Produced by</th></tr></thead>
          <tbody className="divide-y">
            {BUILD.map((r) => (
              <tr key={r.table} className="align-top">
                <td className="px-3 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-[12px] font-medium">{r.table}</code></td>
                <td className="px-3 py-3 text-[13px] text-muted-foreground">{r.holds}</td>
                <td className="px-3 py-3 text-[13px] text-foreground/80">{r.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Honest caveat — the demo simulates ingestion</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Nothing is live-connected yet. Generator scripts <span className="font-medium">simulate</span> the feed — seeding
          tasks/milestones/resources tagged <code className="rounded bg-muted px-1 py-0.5">MS_PROJECT</code>/<code className="rounded bg-muted px-1 py-0.5">P6</code>
          and cost tagged <code className="rounded bg-muted px-1 py-0.5">SAP_PS</code> — so the provenance is realistic but
          not pulled from a real SAP or scheduler. &ldquo;Fed by SAP / the scheduler&rdquo; is the intended Phase-6 architecture.
        </p>
      </div>

      <div className="mt-8"><Link href={`/technical`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Technical notes</Link></div>
    </div>
  );
}
