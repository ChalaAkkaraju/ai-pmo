/**
 * /learn/integration — how the canonical model is filled from SAP PS and the
 * scheduler (the Phase 6 sync contract), in-app and scannable. Valid token only.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';
interface PageProps { params: Promise<{ token: string }>; }

const SOURCES = [
  { src: 'SAP PS', sor: 'WBS structure · budget · baseline · cost actuals · contract', api: 'S/4HANA OData (Enterprise Project) or classic PS BAPIs via the BTP Cloud Connector', c: '#0ea5e9' },
  { src: 'Microsoft Project', sor: 'Tasks · dates · % complete · dependencies · resources', api: 'Dataverse Web API (OData v4) over msdyn_project / msdyn_projecttask (Planner Premium)', c: '#2563eb' },
  { src: 'Primavera P6', sor: 'Activities · dates · % complete · resources', api: 'P6 EPPM REST API (/activities, /resourceassignments)', c: '#7c3aed' },
];

const PRINCIPLES = [
  ['Consume vs build', 'System-of-record data is mirrored read-only with provenance; the app builds only synthesis. The only writes to a source are two one-time provisioning writes.'],
  ['The canonical model is the target', 'Every source maps into the fixed canonical tables (work_packages, tasks, cost_actuals, …). Connectors adapt to it, never the reverse.'],
  ['WBS code is the join key', 'It links SAP cost (per WBS) to scheduler tasks (per WBS). The integrity of that join is the single most important contract obligation.'],
  ['Ports & adapters', 'A source-agnostic ingestion core depends on one SourceConnector interface; each system (and channel) is a swappable adapter. Mock and real adapters are interchangeable.'],
  ['Idempotent & observable', 'Every sync re-runs with no side effects; every run is logged; every unmappable record is queued, not dropped.'],
];

const CHANNELS = [
  ['API', 'Live pull from the source REST/OData API. Preferred for structure and progress.'],
  ['File / SFTP', 'Scheduled flat-file (CSV/XLSX) drop, validated against a published template. Common for SAP cost extracts.'],
  ['Manual upload', 'Ad-hoc CSV/XLSX upload of the same template — one-off corrections or environments without connectivity.'],
];

const PIPELINE = ['Source system', 'Adapter (per source/channel)', 'Mapper (→ canonical, join by WBS)', 'Ingestion service (diff → idempotent upsert → stamp provenance → log)', 'Canonical model'];

export default async function IntegrationPage() {
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className="container mx-auto max-w-screen-lg px-6 py-8">
      <nav className="mb-4 text-sm text-muted-foreground print:hidden">
        <Link href={`/learn`} className="hover:underline">Learn</Link>
        <span className="mx-2">/</span><span className="text-foreground">Integration &amp; sync</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integration &amp; sync</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
            How the canonical model gets filled from the systems of record. Today the data lands via simulation scripts;
            this is the contract for the <span className="font-medium text-foreground">real ingestion service</span> that
            replaces them — read‑only, provenance‑tagged, joined on the WBS code. Nothing in the synthesis layer changes.
          </p>
        </div>
        <PrintButton />
      </div>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">Principles</h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRINCIPLES.map(([t, d]) => (
          <div key={t} className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d}</p></div>
        ))}
      </div>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">Sources &amp; systems of record</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-left">System of record for</th><th className="px-3 py-2 text-left">Primary API</th></tr></thead>
          <tbody className="divide-y">
            {SOURCES.map((s) => (
              <tr key={s.src}><td className="px-3 py-3"><span className="font-semibold" style={{ color: s.c }}>{s.src}</span></td><td className="px-3 py-3 text-muted-foreground">{s.sor}</td><td className="px-3 py-3 text-[13px] text-muted-foreground">{s.api}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        Landscape note: SAP classic PS networks are out of scope — the WBS element carries scope and cost; scheduling lives in
        the external scheduler. Project Online retires 30 Sept 2026; Microsoft Project here means Planner Premium on Dataverse.
      </p>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">The pipeline</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {PIPELINE.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span className="rounded-md border bg-card px-2.5 py-1.5 text-[12px] font-medium">{step}</span>
            {i < PIPELINE.length - 1 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">All three channels feed the same mapper and pipeline — only the adapter at the edge differs. Anything that cannot resolve its WBS is routed to the exception queue, never silently dropped.</p>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">Ingestion channels</h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CHANNELS.map(([t, d]) => (
          <div key={t} className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{d}</p></div>
        ))}
      </div>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">The WBS‑join contract — and the exception queue</h2>
      <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-muted-foreground">
        <p><span className="font-semibold text-foreground">Valid join:</span> a task’s <code className="rounded bg-muted px-1 text-[12px]">wbs_code</code> matches an existing work package for the same project (after coding‑mask normalisation).</p>
        <p><span className="font-semibold text-foreground">Unmapped task:</span> a scheduler task whose WBS code is missing or matches nothing → routed to the exception queue (<code className="rounded bg-muted px-1 text-[12px]">sync_exceptions</code>), never ingested with a dangling reference.</p>
        <p><span className="font-semibold text-foreground">Orphaned WBS:</span> a work package removed in SAP whose tasks still reference it → flagged for a human decision.</p>
        <p><span className="font-semibold text-foreground">Resolution:</span> a human resolves each exception from the Integration admin screen. The exception queue <em>is</em> the reconciliation layer — the most valuable and most human part of the integration.</p>
      </div>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">Sync semantics</h2>
      <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-muted-foreground">
        <li><span className="font-semibold text-foreground">Triggers:</span> scheduled delta (nightly) + on‑demand “Sync Now” + file‑drop poll.</li>
        <li><span className="font-semibold text-foreground">Ordering:</span> WBS before tasks, structure before cost — the orchestrator enforces it.</li>
        <li><span className="font-semibold text-foreground">Idempotency:</span> upsert keyed on (source_system, external_id); an unchanged re‑run is a no‑op.</li>
        <li><span className="font-semibold text-foreground">Diff before apply:</span> each run diffs against current rows; large/destructive diffs can require confirmation.</li>
        <li><span className="font-semibold text-foreground">Conflict policy:</span> system of record wins for mirrored fields; app‑native (unbooked) rows are never overwritten.</li>
      </ul>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider">The only writes back — two provisioning writes</h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/40 p-4"><p className="text-sm font-semibold">1 · Book WBS → SAP</p><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">The AI‑authored, human‑approved WBS is created in SAP PS (BAPI / Enterprise Project OData), simulate‑before‑commit; SAP returns the real IDs and provenance flips to SAP_PS.</p></div>
        <div className="rounded-xl border-l-4 border-sky-400 bg-sky-50/40 p-4"><p className="text-sm font-semibold">2 · Publish WBS → scheduler</p><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">The booked WBS <em>structure only</em> (code · name · parent · level — no cost or dates) is created as a read‑only scaffold so planners build WBS‑tagged activities under it.</p></div>
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">Both are gated by approval, fully audited, and validated/simulated before commit. The schedule itself is never authored, and there are no write‑backs to a system of record during execution.</p>

      <div className="mt-7 rounded-xl border bg-muted/30 p-4 text-[13px] text-muted-foreground">
        <span className="font-semibold text-foreground">Provenance &amp; freshness.</span> Every mirrored row carries <code className="rounded bg-background px-1">source_system · external_id · synced_at</code>; the UI shows “as of {'{synced_at}'}” wherever synced figures appear, with a stale badge past a per‑source threshold. Stale joins produce wrong earned value, so honesty about freshness is a trust requirement, not a nicety.
      </div>

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <Link href={`/learn/roadmap`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">The build roadmap →</Link>
        <Link href={`/learn`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">← Learn</Link>
      </div>
    </div>
  );
}
