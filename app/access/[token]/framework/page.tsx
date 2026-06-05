/**
 * Framework explainer page — the PMBOK process matrix as a coverage map.
 * Shows where the AI authors, where it synthesises (read-only), what stays in
 * the engines, and what stays human-led. Education surface; valid token only.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveRoleFromToken } from '@/lib/role-context';
import { FrameworkMatrix } from '@/components/framework-matrix';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function FrameworkPage({ params }: PageProps) {
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
        <span className="text-foreground">Framework</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight">PMBOK coverage — who does what</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
        The PMBOK process matrix — process groups across, knowledge areas down — used as a coverage map. Every process is
        coloured by who owns it, using the <span className="font-medium">same colour code as the process flow</span>. Read it
        as a boundary, not a claim to do all of project management: the <span className="font-medium" style={{ color: '#3B6D11' }}>AI&nbsp;PMO</span>
        footprint concentrates in Planning (authoring) and Monitoring &amp; Controlling (synthesis); Executing stays with the
        engines — <span className="font-medium" style={{ color: '#185FA5' }}>SAP&nbsp;PS</span> and the <span className="font-medium" style={{ color: '#854F0B' }}>scheduler</span> —
        and with <span className="font-medium" style={{ color: '#534AB7' }}>people</span>. That is the consume-vs-build line.
      </p>

      <div className="mt-6">
        <FrameworkMatrix />
      </div>

      <p className="mt-5 max-w-3xl rounded-lg border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">A note on the framework.</span> PMBOK 7 (2021) moved away from this
        49-process matrix toward principles and performance domains. The process matrix remains the most widely recognised
        teaching model, so it is used here as a familiar coverage map — the ownership story is the same under either lens.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/access/${token}/architecture`} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">See the architecture →</Link>
        <Link href={`/access/${token}/agents`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">The 14 agents →</Link>
        <Link href={`/access/${token}`} className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">Back to portfolio</Link>
      </div>
    </div>
  );
}
