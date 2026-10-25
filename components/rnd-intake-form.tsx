'use client';

/**
 * R&D programme intake. Creates the programme as 'proposed' at stage 0 and
 * writes v1 of its business case.
 *
 * The form shows expected commercial value live as the figures are typed —
 * not to gate the submission, but because seeing ECV move as the two
 * probabilities change is the fastest way to learn what the measure is
 * actually sensitive to. Research programmes leave the commercial half blank
 * and are ranked on feasibility instead; the form says so rather than
 * demanding a number nobody can honestly give.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RND_BUCKETS, RND_BUCKET_LABELS, RND_CATEGORY_LABELS, ecv, fmtMoneyRnd } from '@/lib/rnd';
import type { RndCategory } from '@/lib/types';

const CURRENT_FY = new Date().getFullYear() + 1;

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

export function RndIntakeForm() {
  const router = useRouter();
  const [code, setCode] = useState<string>('…');
  const [f, setF] = useState({
    name: '', sponsor: '', category: 'new_product' as RndCategory, bucket: 'new_products',
    fiscal_year: String(CURRENT_FY), requested_budget: '',
    npv: '', peak_annual_sales: '', launch_date: '', development_cost_estimate: '', launch_cost: '',
    technical_success_pct: '60', commercial_success_pct: '70',
    problem: '', outcome: '', hard_deadline: '', notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects/rnd').then((r) => r.json()).then((j) => setCode(j.code ?? '—')).catch(() => setCode('—'));
  }, []);

  const research = f.category === 'platform_research';

  const liveEcv = useMemo(() => ecv({
    npv: num(f.npv), launch_cost: num(f.launch_cost),
    development_cost_estimate: num(f.development_cost_estimate),
    technical_success_pct: num(f.technical_success_pct),
    commercial_success_pct: num(f.commercial_success_pct),
  }), [f.npv, f.launch_cost, f.development_cost_estimate, f.technical_success_pct, f.commercial_success_pct]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/projects/rnd', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, sponsor: f.sponsor, category: f.category, bucket: f.bucket,
          fiscal_year: Number(f.fiscal_year), requested_budget: Number(f.requested_budget || 0),
          problem: f.problem, outcome: f.outcome,
          hard_deadline: f.hard_deadline || null,
          business_case: {
            npv: num(f.npv), peak_annual_sales: num(f.peak_annual_sales),
            launch_date: f.launch_date || null,
            development_cost_estimate: num(f.development_cost_estimate),
            launch_cost: num(f.launch_cost),
            technical_success_pct: num(f.technical_success_pct),
            commercial_success_pct: num(f.commercial_success_pct),
            notes: f.notes || null,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not create programme');
      router.push(`/projects/${encodeURIComponent(json.project.code)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const field = 'mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm';
  const label = 'text-xs font-medium text-muted-foreground';

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">The programme</h2>
          <p className="text-xs text-muted-foreground">Code <span className="font-mono">{code}</span></p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={label}>Programme name<input required value={f.name} onChange={set('name')} className={field} placeholder="Next-generation flow sensor platform" /></label></div>
          <label className={label}>Business sponsor<input required value={f.sponsor} onChange={set('sponsor')} className={field} placeholder="VP Product — Measurement" /></label>
          <label className={label}>Fiscal year<input type="number" value={f.fiscal_year} onChange={set('fiscal_year')} className={field} /></label>
          <label className={label}>Category
            <select value={f.category} onChange={set('category')} className={field}>
              {(Object.keys(RND_CATEGORY_LABELS) as RndCategory[]).map((c) => <option key={c} value={c}>{RND_CATEGORY_LABELS[c]}</option>)}
            </select>
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Picks the gate model: five gates for a new product, three for a derivative, two for research.</span>
          </label>
          <label className={label}>Bucket
            <select value={f.bucket} onChange={set('bucket')} className={field}>
              {RND_BUCKETS.map((b) => <option key={b} value={b}>{RND_BUCKET_LABELS[b]}</option>)}
            </select>
            {f.bucket === 'regulatory' && <span className="mt-1 block text-[11px] font-normal text-amber-700">Mandatory lane — ranked on cost-to-comply and deadline, not on ECV.</span>}
          </label>
          <label className={label}>Budget requested for the year<input required type="number" value={f.requested_budget} onChange={set('requested_budget')} className={field} placeholder="2800000" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Nothing is committed by this: money is released gate by gate.</span>
          </label>
          <div className="sm:col-span-2"><label className={label}>The problem<textarea value={f.problem} onChange={set('problem')} rows={2} className={field} placeholder="What unmet need or constraint makes this worth doing?" /></label></div>
          <div className="sm:col-span-2"><label className={label}>The outcome<textarea value={f.outcome} onChange={set('outcome')} rows={2} className={field} placeholder="What exists at the end that does not exist now?" /></label></div>
          <div className="sm:col-span-2"><label className={label}>Hard deadline, if any<input value={f.hard_deadline} onChange={set('hard_deadline')} className={field} placeholder="Regulation effective 1 January 2029" /></label></div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">The case, version 1</h2>
        <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
          This is the first version, not the last. It will be re-underwritten at every gate, and what matters later is how far it has moved from the version approved at commit — so an honest rough number now is worth more than a confident one.
        </p>
        {research && (
          <p className="mt-2 rounded-md border border-violet-200 bg-violet-50/60 p-3 text-xs text-violet-900">
            Research programmes are judged on feasibility and knowledge gained, not NPV. Leave the commercial figures blank if there is no product route yet — a blank is honest, a guessed NPV is not, and the pipeline ranks unscored programmes separately rather than at zero.
          </p>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className={label}>NPV<input type="number" value={f.npv} onChange={set('npv')} className={field} placeholder={research ? 'leave blank' : '5600000'} /></label>
          <label className={label}>Peak annual sales<input type="number" value={f.peak_annual_sales} onChange={set('peak_annual_sales')} className={field} placeholder={research ? 'leave blank' : '3900000'} /></label>
          <label className={label}>Target launch date<input type="date" value={f.launch_date} onChange={set('launch_date')} className={field} /></label>
          <label className={label}>Development cost estimate<input type="number" value={f.development_cost_estimate} onChange={set('development_cost_estimate')} className={field} placeholder="2300000" /></label>
          <label className={label}>Launch cost<input type="number" value={f.launch_cost} onChange={set('launch_cost')} className={field} placeholder="500000" /></label>
          <div />
          <label className={label}>P(technical success) %<input type="number" min={0} max={100} value={f.technical_success_pct} onChange={set('technical_success_pct')} className={field} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Can it be built at all?</span>
          </label>
          <label className={label}>P(commercial success) %<input type="number" min={0} max={100} value={f.commercial_success_pct} onChange={set('commercial_success_pct')} className={field} placeholder={research ? 'leave blank' : '70'} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">If built, will anyone buy it?</span>
          </label>
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Expected commercial value</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${(liveEcv ?? 0) < 0 ? 'text-rose-700' : ''}`}>{liveEcv === null ? 'not scored' : fmtMoneyRnd(liveEcv)}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">[(NPV × P(comm)) − launch] × P(tech) − development</p>
          </div>
          <div className="sm:col-span-3"><label className={label}>Notes on the case<textarea value={f.notes} onChange={set('notes')} rows={2} className={field} placeholder="What the figures rest on, and what would have to be true for them to hold." /></label></div>
        </div>
      </section>

      {error && <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50">
          {busy ? 'Submitting…' : 'Submit programme'}
        </button>
        <p className="text-xs text-muted-foreground">Lands as <em>proposed</em> at stage 0. The first gate decides whether it gets a scoping allowance.</p>
      </div>
    </form>
  );
}
