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
import { getSessionRole } from '@/lib/auth';
import { WelcomeActions } from '@/components/welcome-actions';
import { WorkspaceLauncher, type LaunchCard } from '@/components/workspace-launcher';
import { WORKSPACES } from '@/lib/welcome-content';
import { signOut } from '@/app/login/actions';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { scopedTypes } from '@/lib/workspace';
import type { Role } from '@/lib/types';

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
  const resolved = await getSessionRole();
  if (!resolved) notFound();

  // ---- Workspace launcher: one card per PMO the viewer can reach ----------
  const own = resolved.actor ?? resolved.role;
  const canSwitch = Boolean(own.demo_switcher);
  const sb = createSupabaseServiceClient();
  const [projRes, roleRes, recRes] = await Promise.all([
    sb.from('projects').select('project_type, status, lifecycle_status, approved_budget_current'),
    canSwitch ? sb.from('roles').select('id, name, role_type, created_at').eq('disabled', false).order('created_at') : Promise.resolve({ data: [] }),
    sb.from('decision_records').select('project_type').eq('status', 'proposed'),
  ]);
  const projects = (projRes.data ?? []) as Array<{ project_type: string | null; status: string; lifecycle_status: string | null; approved_budget_current: number | null }>;
  const roles = (roleRes.data ?? []) as Array<Pick<Role, 'id' | 'name' | 'role_type'>>;
  const open = ((recRes.data ?? []) as Array<{ project_type: string }>).reduce<Record<string, number>>((m, r) => { m[r.project_type] = (m[r.project_type] ?? 0) + 1; return m; }, {});
  const ofType = (t: string) => projects.filter((p) => (p.project_type ?? 'revenue') === t);
  const first = (rt: string) => roles.find((r) => r.role_type === rt) ?? null;
  const revenueOwn = !/^(it_|rnd_|capital_)/.test(own.role_type) && !['portfolio_executive', 'admin'].includes(own.role_type);
  const revPersona = revenueOwn ? { id: 'self', name: own.name } : first('pm');
  const roleFor: Record<string, string | null> = {
    enterprise: first('portfolio_executive')?.id ?? null, revenue: revPersona?.id ?? null, it: first('it_portfolio_manager')?.id ?? null,
    rnd: first('rnd_portfolio_manager')?.id ?? null, capital: first('capital_portfolio_manager')?.id ?? null,
  };
  const all: LaunchCard[] = WORKSPACES.map((w) => ({ ...w, roleId: roleFor[w.key] }));
  const reach = scopedTypes(resolved.role) as string[];
  const cards = canSwitch ? all : all.filter((c) => (c.key === 'enterprise' ? resolved.role.role_type === 'portfolio_executive' : reach.includes(c.key)));
  const showLauncher = cards.length >= 2;

  return (
    <div className={`${display.className} relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-8 py-10 text-center`}>
      {/* Already signed in: no header here, so offer the one action that matters — sign out. */}
      <form action={signOut} className="absolute right-6 top-5 z-10">
        <button type="submit" className="rounded-lg border bg-white/80 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-white">Sign out</button>
      </form>

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
      {showLauncher ? (
        <>
          {/* The pitch: the problem in one line, the promise in one line, then three outcomes. */}
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI PMO · one intelligence layer for every PMO</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-[1.15] tracking-tight sm:text-[2.6rem]">
            Adds{' '}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">Intelligence</span>
            {' '}to your PMO
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-[17px] leading-relaxed text-muted-foreground">
            Cost sits in the ERP. Schedule sits in the scheduler. The business case sits in a spreadsheet —{' '}
            <span className="font-semibold text-foreground">and they have never agreed.</span>{' '}
            AI PMO joins them across Revenue, IT, R&amp;D and Capital, explains what moved and why, and puts every decision
            in front of the person who owns it.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { t: 'No re-keying', c: 'bg-violet-50 text-violet-800 ring-violet-200' },
              { t: 'No month-end reconciliation', c: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
              { t: 'Decisions, not reports', c: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
            ].map((x) => (
              <span key={x.t} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 ${x.c}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />{x.t}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
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

        </>
      )}

      {showLauncher && <WorkspaceLauncher cards={cards} canSwitch={canSwitch} />}

      {/* Proof points — what's actually built */}
      {!showLauncher && <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
        {PROOF.map((p) => (
          <div key={p.title} className="rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${p.ring}`}>
              <p.Icon className={`h-5 w-5 ${p.accent}`} strokeWidth={1.9} />
            </span>
            <p className="mt-2.5 text-[13px] font-semibold leading-snug">{p.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>}

      {/* Curiosity hook (single-workspace view; the launcher view carries it in the pitch) */}
      {!showLauncher && <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-foreground/80">
        Cost lives in your ERP. Schedule lives in your scheduler. They&apos;ve never agreed — <span className="font-semibold text-foreground">until now.</span>
      </p>}

      {/* Primary + secondary CTA (one row), with the skip control */}
      {/* With the launcher the cards are the way in; the tour stays in the Learn menu. */}
      {!showLauncher && <WelcomeActions />}

      <p className="mt-7 text-xs text-muted-foreground">
        Portfolio shown is illustrative sample data · explore more from the <span className="font-medium text-foreground/70">Learn</span> menu · return anytime at <span className="font-mono">/welcome</span>.
      </p>
    </div>
  );
}
