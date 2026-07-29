/**
 * /learn/roadmap — the phased path from canonical model to a live integration
 * layer. Statuses reflect the actual current build (0–5 built, 6 in progress).
 * Valid token only.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionRole } from '@/lib/auth';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';
interface PageProps { params: Promise<{ token: string }>; }

const SCOPE = [
  ['ERP — SAP PS, WBS only', 'The WBS element carries scope, structure and cost (budget, actuals, commitments). No PS network activities — scheduling lives entirely in the external scheduler.'],
  ['Schedulers — Primavera P6 and Microsoft Project', 'Both supply tasks, dates, % complete, dependencies and resource assignments. (Project Online is out of scope — it retires Sept 2026; the MS target is Planner Premium on Dataverse.)'],
  ['The join key is the WBS code', 'It links SAP cost (per WBS) to scheduler tasks (per WBS) — the join that makes earned value possible.'],
  ['Consume vs build', 'System-of-record data is mirrored read-only with provenance; the app builds only synthesis.'],
];

type Status = 'Built' | 'In progress';
const PHASES: { n: number; title: string; goal: string; exit: string; status: Status }[] = [
  { n: 0, title: 'Canonical model + provenance', goal: 'A structured, ingestion-shaped data model that everything else reads.', exit: 'Schema migrated; seed shows provenance + a last-synced state.', status: 'Built' },
  { n: 1, title: 'Structured WBS (SAP PS scope)', goal: 'The WBS as real, queryable data instead of markdown prose.', exit: 'Every project has a structured WBS tree with a “synced from SAP PS” badge.', status: 'Built' },
  { n: 2, title: 'Structured schedule + real Gantt', goal: 'Tasks and dates as data; a true phase Gantt (P6 / Microsoft Project).', exit: 'A real Gantt per project; tasks roll up to their WBS work package.', status: 'Built' },
  { n: 3, title: 'Earned value (flagship)', goal: 'Real EV from joined cost and schedule.', exit: 'The earned-value dashboard is computed, not seeded.', status: 'Built' },
  { n: 4, title: 'Resources (visibility, not levelling)', goal: 'The cross-portfolio resource picture — demand vs capacity.', exit: 'A portfolio resource-load view with over-allocation flags.', status: 'Built' },
  { n: 5, title: 'Synthesis upgrade', goal: 'Agents cite real structure (WBS, tasks, EV), not just markdown.', exit: 'The narrative references real EV and critical-path facts; recommendations point to work packages.', status: 'Built' },
  { n: 6, title: 'Real integration layer', goal: 'Turn simulated ingestion into a real, specified sync (connectors, auth, idempotency).', exit: 'At least one connector live, or a fully-specified, testable sync contract.', status: 'In progress' },
];

const SB: Record<Status, string> = { Built: 'bg-emerald-100 text-emerald-700', 'In progress': 'bg-amber-100 text-amber-700' };

export default async function RoadmapPage() {
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-4 text-sm text-muted-foreground print:hidden">
        <Link href={`/learn`} className="hover:underline">Learn</Link>
        <span className="mx-2">/</span><span className="text-foreground">Build roadmap</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Build roadmap</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            From a synthesis demo to the ERP‑and‑scheduler intelligence layer. AI PMO <span className="font-medium text-foreground">consumes</span> the
            engines (it does not replicate scheduling or accounting) and <span className="font-medium text-foreground">builds</span> the synthesis —
            with earned value as the flagship. Each phase is independently demoable with an explicit exit criterion.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-5 rounded-xl border bg-muted/30 p-4 text-[14px] leading-relaxed text-foreground/80">
        <span className="font-semibold">Architecture in one line:</span> SAP PS (WBS + cost) <em>and</em> P6 / Microsoft Project (tasks, dates, % complete, resources)
        → ingestion (provenance‑tagged) → <span className="font-medium">canonical model</span> → AI synthesis (EV, risk &amp; change, narrative, recommendations).
      </div>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">Scope decisions (locked)</h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SCOPE.map(([t, d]) => (
          <div key={t} className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d}</p></div>
        ))}
      </div>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">The phases</h2>
      <div className="mt-3 space-y-3">
        {PHASES.map((p) => (
          <div key={p.n} className="flex gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{p.n}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{p.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SB[p.status]}`}>{p.status}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground/70">Goal: </span>{p.goal}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground/70">Exit: </span>{p.exit}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-xl border bg-muted/30 p-4 text-[13px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Where we are.</span> The synthesis side and the structured consume model
        (Phases 0–5) are built; the portfolio shown is illustrative sample data. Phase 6 — the real ingestion service — is
        specified as a sync contract with a mock SAP pipeline and an Integration admin screen in place; live connectors are
        what make a real tenant’s data flow.
      </div>

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <Link href={`/learn/integration`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Integration &amp; sync</Link>
        <Link href={`/learn`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Learn</Link>
      </div>
    </div>
  );
}
