/**
 * Welcome / landing page. Shown on the first dashboard visit of a session
 * (via WelcomeGate) and reachable anytime at /access/[token]/welcome.
 *
 * A sales gateway built to spark curiosity: a glowing hero with a gradient
 * accent, three proof points, a one-line hook that sets up the "how", and the
 * two CTAs. Deeper explainers live in the header Learn menu.
 */

import { notFound } from 'next/navigation';
import { Sparkles, TrendingUp, Layers, ShieldCheck } from 'lucide-react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { resolveRoleFromToken } from '@/lib/role-context';
import { WelcomeActions } from '@/components/welcome-actions';

export const dynamic = 'force-dynamic';

const display = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

const PROOF = [
  {
    Icon: TrendingUp,
    accent: 'text-emerald-600',
    ring: 'bg-emerald-50',
    title: 'The one number no single system produces',
    body: 'Cost from your ERP, progress from your scheduler — joined into earned value, CPI/SPI, earned schedule and a forecast finish date.',
  },
  {
    Icon: Layers,
    accent: 'text-sky-600',
    ring: 'bg-sky-50',
    title: 'Cost-to-cash, reconciled to the WBS',
    body: 'Budget → commitment → actual → billed → net unbilled, plus cost elements and labour productivity — every figure ties to the same WBS phase.',
  },
  {
    Icon: ShieldCheck,
    accent: 'text-violet-600',
    ring: 'bg-violet-50',
    title: 'Answers from your real portfolio',
    body: 'Ask in plain English; a specialist agent replies from your live data — every figure traceable to the source, not generic AI guesswork.',
  },
];

export default async function WelcomePage() {
  const token = 'session';
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className={`${display.className} relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-8 py-10 text-center`}>
      {/* Soft colour glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-12 -z-10 h-80 w-[42rem] max-w-[90vw] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.20), rgba(16,185,129,0.12), transparent)' }}
      />

      {/* Hero */}
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground shadow-lg shadow-violet-600/20" style={{ color: '#FBBF24' }}>
        <Sparkles className="h-8 w-8" strokeWidth={1.75} />
      </span>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI PMO · intelligence layer</p>
      <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        Adds{' '}
        <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">Intelligence</span>
        {' '}to your PMO
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        It sits above your ERP and your scheduler and does the part neither can — fusing cost, schedule, commitment,
        billing, risk and change into one explained portfolio picture, with the analysis already done. Your people
        decide; the re-keying and reconciliation are gone.
      </p>

      {/* Proof points — what's actually built */}
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
        {PROOF.map((p) => (
          <div key={p.title} className="rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${p.ring}`}>
              <p.Icon className={`h-5 w-5 ${p.accent}`} strokeWidth={1.9} />
            </span>
            <p className="mt-2.5 text-[13px] font-semibold leading-snug">{p.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Curiosity hook */}
      <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-foreground/80">
        Cost lives in your ERP. Schedule lives in your scheduler. They&apos;ve never agreed — <span className="font-semibold text-foreground">until now.</span>
      </p>

      {/* Primary + secondary CTA (one row), with the skip control */}
      <WelcomeActions token={token} />

      <p className="mt-7 text-xs text-muted-foreground">
        Portfolio shown is illustrative sample data · explore more from the <span className="font-medium text-foreground/70">Learn</span> menu · return anytime at <span className="font-mono">/welcome</span>.
      </p>
    </div>
  );
}
