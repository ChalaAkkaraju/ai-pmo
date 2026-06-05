/**
 * Welcome / landing page. Shown on the first dashboard visit of a session
 * (via WelcomeGate) and reachable anytime at /access/[token]/welcome.
 *
 * Deliberately a one-screen gateway: the positioning hook + a way in. The full
 * narrative (problem, where it fits, how it works, earned value, what makes it
 * different) lives on /about; the design surfaces on /architecture, /framework
 * and /agents.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, TrendingUp, Bot, UserCheck, Plug, ArrowRight } from 'lucide-react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { resolveRoleFromToken } from '@/lib/role-context';
import { WelcomeActions } from '@/components/welcome-actions';

export const dynamic = 'force-dynamic';

const display = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' });

const HERO_CHIPS = [
  { label: 'Earned value built in', cls: 'bg-emerald-100 text-emerald-800', Icon: TrendingUp },
  { label: '13 specialist agents', cls: 'bg-violet-100 text-violet-800', Icon: Bot },
  { label: 'Human-in-the-loop', cls: 'bg-amber-100 text-amber-800', Icon: UserCheck },
  { label: 'Tool-agnostic', cls: 'bg-sky-100 text-sky-800', Icon: Plug },
];

export default async function WelcomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveRoleFromToken(token);
  if (!resolved) notFound();

  return (
    <div className={`${display.className} container mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-3xl flex-col items-center justify-center px-8 py-12 text-center`}>
      {/* Hero */}
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground" style={{ color: '#FBBF24' }}>
        <Sparkles className="h-8 w-8" strokeWidth={1.75} />
      </span>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI PMO · intelligence layer</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">The intelligence layer your project office is missing</h1>
      <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
        It sits above your ERP and your scheduler and does the part neither can — turning cost, schedule, risk and
        change into one explained portfolio picture, with the analysis already done.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {HERO_CHIPS.map((c) => (
          <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.cls}`}>
            <c.Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {c.label}
          </span>
        ))}
      </div>

      {/* Primary CTA */}
      <WelcomeActions token={token} />

      {/* Learn more */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-sm">
        <Link href={`/access/${token}/about`} className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-1.5 font-medium transition hover:bg-muted">
          How it works <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
        <Link href={`/access/${token}/architecture`} className="rounded-full border px-3.5 py-1.5 font-medium transition hover:bg-muted hover:border-foreground/20">Architecture</Link>
        <Link href={`/access/${token}/framework`} className="rounded-full border px-3.5 py-1.5 font-medium transition hover:bg-muted hover:border-foreground/20">PMBOK coverage</Link>
        <Link href={`/access/${token}/agents`} className="rounded-full border px-3.5 py-1.5 font-medium transition hover:bg-muted hover:border-foreground/20">The 13 agents</Link>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Portfolio shown is illustrative sample data. Return anytime at <span className="font-mono">/welcome</span>.
      </p>
    </div>
  );
}
