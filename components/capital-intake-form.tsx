'use client';

/**
 * Capital project request. Lands as 'proposed' at FEL1 (major) or Define
 * (minor); nothing is appropriated by it.
 *
 * The capex test is the first section on purpose: it is the first question
 * Finance asks, and a "capital project" that is really like-for-like repair is
 * cheapest to catch before anyone writes an estimate. The verdict updates as
 * the boxes are ticked, and the authority line shows who will eventually have
 * to sanction an AFE of the size being estimated.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CAPITAL_BUCKETS, CAPITAL_BUCKET_LABELS, CAPITAL_CATEGORY_LABELS, afeAuthority, capexVerdict, type CapexTest } from '@/lib/capital';
import { parseMoney, formatMoneyPreview } from '@/lib/intake-config';

const CURRENT_FY = new Date().getFullYear() + 1;
const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

const TESTS: Array<{ key: keyof CapexTest; label: string; hint: string }> = [
  { key: 'new_asset', label: 'Creates a new asset', hint: 'A new line, unit, building or system brought into use.' },
  { key: 'extends_life', label: 'Extends the useful life of an existing asset', hint: 'Beyond what it had when first acquired.' },
  { key: 'adds_capacity', label: 'Adds capacity or capability', hint: 'More throughput, a new product, better efficiency than the original design.' },
  { key: 'like_for_like_repair', label: 'Includes like-for-like repair or maintenance', hint: 'Restores the original condition — that part is expensed.' },
];

export function CapitalIntakeForm() {
  const router = useRouter();
  const [code, setCode] = useState<string>('…');
  const [f, setF] = useState({
    name: '', site: '', sponsor: '', category: 'major', bucket: 'growth', fiscal_year: String(CURRENT_FY),
    requested_budget: '', in_service_date: '', asset_class: '', useful_life_years: '',
    npv: '', irr_pct: '', payback_months: '', annual_benefit: '', problem: '', outcome: '',
  });
  const [t, setT] = useState<CapexTest>({ new_asset: false, extends_life: false, adds_capacity: false, like_for_like_repair: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetch('/api/projects/capital').then((r) => r.json()).then((j) => setCode(j.code ?? '—')).catch(() => setCode('—')); }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const verdict = useMemo(() => (Object.values(t).some(Boolean) ? capexVerdict(t) : null), [t]);
  const budget = parseMoney(f.requested_budget);
  const authority = budget ? afeAuthority(budget) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!budget) { setError('Give an order-of-magnitude estimate, e.g. 4.5M or 850k.'); return; }
    if (!verdict) { setError('Answer the capex test — at least one box must apply.'); return; }
    if (verdict.verdict === 'opex') { setError(verdict.reason); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/projects/capital', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, site: f.site, sponsor: f.sponsor, category: f.category, bucket: f.bucket,
          fiscal_year: Number(f.fiscal_year), requested_budget: budget,
          in_service_date: f.in_service_date || null, asset_class: f.asset_class || null,
          useful_life_years: num(f.useful_life_years), npv: parseMoney(f.npv), irr_pct: num(f.irr_pct),
          payback_months: num(f.payback_months), annual_benefit: parseMoney(f.annual_benefit),
          problem: f.problem, outcome: f.outcome, capex_test: t,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not create the request');
      router.push(`/projects/${encodeURIComponent(json.project.code)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const field = 'mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm';
  const label = 'text-xs font-medium text-muted-foreground';
  const tone = verdict?.verdict === 'capex' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : verdict?.verdict === 'mixed' ? 'border-amber-300 bg-amber-50 text-amber-900' : verdict?.verdict === 'opex' ? 'border-red-300 bg-red-50 text-red-900' : 'border-dashed text-muted-foreground';

  return (
    <form onSubmit={submit} className="mt-6 space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">1 · Is this capital? <span className="font-normal text-muted-foreground">— the capex test</span></h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Spend capitalises when it creates an asset, extends one&rsquo;s life or adds capacity. Restoring original condition is maintenance and is expensed, whatever its size.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TESTS.map((x) => (
            <label key={x.key} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${t[x.key] ? 'border-blue-300 bg-blue-50/60' : ''}`}>
              <input type="checkbox" className="mt-0.5" checked={t[x.key]} onChange={(e) => setT((s) => ({ ...s, [x.key]: e.target.checked }))} />
              <span><span className="font-medium">{x.label}</span><span className="block text-[11px] text-muted-foreground">{x.hint}</span></span>
            </label>
          ))}
        </div>
        <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>
          {verdict ? <><span className="font-semibold uppercase">{verdict.verdict}</span> — {verdict.reason}</> : 'Tick what applies to see the classification.'}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">2 · The project</h2>
          <p className="text-xs text-muted-foreground">Code <span className="font-mono">{code}</span></p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={label}>Project name<input required value={f.name} onChange={set('name')} className={field} placeholder="Line 5 bottling expansion" /></label></div>
          <label className={label}>Site<input required value={f.site} onChange={set('site')} className={field} placeholder="Northwind Rotterdam" /></label>
          <label className={label}>Plant manager / sponsor<input required value={f.sponsor} onChange={set('sponsor')} className={field} placeholder="Luis Moreno" /></label>
          <label className={label}>Category
            <select value={f.bucket} onChange={set('bucket')} className={field}>
              {CAPITAL_BUCKETS.map((b) => <option key={b} value={b}>{CAPITAL_BUCKET_LABELS[b]}</option>)}
            </select>
          </label>
          <label className={label}>Project size
            <select value={f.category} onChange={set('category')} className={field}>
              {Object.entries(CAPITAL_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className={label}>Fiscal year of the capital plan<input type="number" value={f.fiscal_year} onChange={set('fiscal_year')} className={field} /></label>
          <label className={label}>Target in-service date<input type="date" value={f.in_service_date} onChange={set('in_service_date')} className={field} /></label>
          <div className="sm:col-span-2"><label className={label}>The need<textarea value={f.problem} onChange={set('problem')} rows={2} className={field} placeholder="What fails, constrains or is required if nothing is done?" /></label></div>
          <div className="sm:col-span-2"><label className={label}>The outcome<textarea value={f.outcome} onChange={set('outcome')} rows={2} className={field} placeholder="What the asset delivers once in service." /></label></div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">3 · Estimate and economics <span className="font-normal text-muted-foreground">— order of magnitude at FEL1 (−50% / +100%)</span></h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className={label}>Estimated total cost<input required value={f.requested_budget} onChange={set('requested_budget')} className={field} placeholder="e.g. 4.5M" />
            {budget ? <span className="mt-1 block text-[11px] text-muted-foreground">{formatMoneyPreview(budget)}{authority ? ` · an AFE this size is sanctioned by the ${authority.label.toLowerCase()}` : ''}</span> : null}
          </label>
          <label className={label}>NPV<input value={f.npv} onChange={set('npv')} className={field} placeholder="e.g. 6.2M" /></label>
          <label className={label}>IRR %<input type="number" step="0.1" value={f.irr_pct} onChange={set('irr_pct')} className={field} /></label>
          <label className={label}>Payback (months)<input type="number" value={f.payback_months} onChange={set('payback_months')} className={field} /></label>
          <label className={label}>Annual benefit<input value={f.annual_benefit} onChange={set('annual_benefit')} className={field} placeholder="e.g. 1.1M" /></label>
          <label className={label}>Asset class<input value={f.asset_class} onChange={set('asset_class')} className={field} placeholder="Plant & machinery" /></label>
          <label className={label}>Useful life (years)<input type="number" value={f.useful_life_years} onChange={set('useful_life_years')} className={field} /></label>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">HSE and regulatory requests may leave the economics blank — they are ranked on cost-to-comply, not return.</p>
      </section>

      {error && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">{busy ? 'Submitting…' : 'Submit capital request'}</button>
      </div>
    </form>
  );
}
