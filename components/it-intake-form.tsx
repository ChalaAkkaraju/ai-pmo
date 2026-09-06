'use client';

/**
 * IT project intake — the AOP submission sheet. Creates the project as
 * 'proposed' for a fiscal year; the waterline approves it, Stage Gate 1 locks it.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IT_BUCKETS, IT_BUCKET_LABELS, IT_CATEGORY_LABELS, VALUE_TYPE_LABELS, fmtMoney, recomputeCase } from '@/lib/it-portfolio';
import type { ItCategory, ValueType } from '@/lib/types';

const CURRENT_FY = new Date().getFullYear() + 1;

export function ItIntakeForm({ continuationCandidates }: { continuationCandidates: Array<{ code: string; name: string; fiscal_year: number | null }> }) {
  const router = useRouter();
  const [code, setCode] = useState<string>('…');
  const [f, setF] = useState({
    name: '', sponsor: '', category: 'design_development' as ItCategory, bucket: 'applications', fiscal_year: CURRENT_FY,
    requested_budget: '', value_type: 'hard_savings' as ValueType, benefit_summary: '', annual_benefit: '', strategic_score: '60',
    benefits_owner: '', capex_share_pct: '70', continuation_of_code: '', hard_deadline: '', problem: '', outcome: '', systems: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects/it').then((r) => r.json()).then((j) => setCode(j.code ?? '—')).catch(() => setCode('—'));
  }, []);

  const derived = useMemo(() => recomputeCase(Number(f.requested_budget || 0), Number(f.annual_benefit || 0)), [f.requested_budget, f.annual_benefit]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/projects/it', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name, sponsor: f.sponsor, category: f.category, bucket: f.bucket, fiscal_year: Number(f.fiscal_year),
          requested_budget: Number(f.requested_budget || 0),
          business_case: {
            value_type: f.value_type, benefit_summary: f.benefit_summary,
            annual_benefit: f.annual_benefit ? Number(f.annual_benefit) : null,
            strategic_score: f.strategic_score ? Number(f.strategic_score) : null,
            benefits_owner: f.benefits_owner || null,
            capex_share_pct: f.capex_share_pct ? Number(f.capex_share_pct) : null,
            is_mandatory: f.value_type === 'compliance',
          },
          continuation_of_code: f.continuation_of_code || null,
          hard_deadline: f.hard_deadline || null,
          intake: { problem: f.problem, outcome: f.outcome, systems: f.systems },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not create project');
      router.push(`/projects/${encodeURIComponent(json.project.code)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const input = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm';
  const label = 'block text-xs font-medium text-muted-foreground';

  return (
    <form onSubmit={submit} className="mt-6 space-y-8">
      <Section title="1. Identity" blurb={`Code assigned on create: ${code}`}>
        <Field label="Project name *" wide><input required className={input} value={f.name} onChange={set('name')} /></Field>
        <Field label="Sponsor (business owner) *"><input required className={input} value={f.sponsor} onChange={set('sponsor')} /></Field>
        <Field label="Category *">
          <select className={input} value={f.category} onChange={set('category')}>
            {Object.entries(IT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Bucket *">
          <select className={input} value={f.bucket} onChange={set('bucket')}>
            {IT_BUCKETS.map((b) => <option key={b} value={b}>{IT_BUCKET_LABELS[b]}</option>)}
          </select>
        </Field>
        <Field label="Fiscal year *"><input type="number" required className={input} value={f.fiscal_year} onChange={set('fiscal_year')} /></Field>
        <Field label="Continuation of (existing project)">
          <select className={input} value={f.continuation_of_code} onChange={set('continuation_of_code')}>
            <option value="">— new project —</option>
            {continuationCandidates.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}{c.fiscal_year ? ` (FY${c.fiscal_year})` : ''}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="2. Business case" blurb="Say plainly what kind of value this claims. Compliance work is ranked on cost-to-comply and deadline, not ROI.">
        <Field label="Value type *">
          <select className={input} value={f.value_type} onChange={set('value_type')}>
            {Object.entries(VALUE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Strategic score (0–100)"><input type="number" min={0} max={100} className={input} value={f.strategic_score} onChange={set('strategic_score')} /></Field>
        <Field label="Requested budget (FY) *"><input type="number" min={0} required className={input} value={f.requested_budget} onChange={set('requested_budget')} /></Field>
        <Field label="Annual benefit"><input type="number" min={0} className={input} value={f.annual_benefit} onChange={set('annual_benefit')} /></Field>
        <Field label="Benefit summary *" wide><textarea required rows={3} className={input} value={f.benefit_summary} onChange={set('benefit_summary')} placeholder="What changes for the business, measured how, from when" /></Field>
        <Field label="Benefits owner"><input className={input} value={f.benefits_owner} onChange={set('benefits_owner')} placeholder="Named person who reports realisation" /></Field>
        <Field label="Expected capital share %"><input type="number" min={0} max={100} className={input} value={f.capex_share_pct} onChange={set('capex_share_pct')} /></Field>
        <div className="sm:col-span-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Derived from budget and benefit: 3-yr ROI <strong className="text-foreground">{derived.roi_pct != null ? `${derived.roi_pct}%` : '—'}</strong> · payback <strong className="text-foreground">{derived.payback_months != null ? `${derived.payback_months} months` : '—'}</strong> · requested {fmtMoney(Number(f.requested_budget || 0))}
        </div>
      </Section>

      <Section title="3. Scope & schedule" blurb="Enough for the Stage Gate 0 charter; the detail comes in Discovery.">
        <Field label="Problem being solved" wide><textarea rows={2} className={input} value={f.problem} onChange={set('problem')} /></Field>
        <Field label="Outcome when done" wide><textarea rows={2} className={input} value={f.outcome} onChange={set('outcome')} /></Field>
        <Field label="Systems affected"><input className={input} value={f.systems} onChange={set('systems')} placeholder="e.g. SAP PS, Cora PPM, Sopheon" /></Field>
        <Field label="Hard deadline (if any)"><input className={input} value={f.hard_deadline} onChange={set('hard_deadline')} placeholder="e.g. regulatory date, contract end" /></Field>
      </Section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50">
          {busy ? 'Creating…' : 'Submit to the FY portfolio'}
        </button>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}

function Section({ title, blurb, children }: { title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {blurb && <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? 'sm:col-span-2' : ''}>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
