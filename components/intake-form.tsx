'use client';

/**
 * Per-segment project intake form — the web equivalent of the printed
 * "Project Data Sheet". Config-driven (lib/intake-config.ts) so all four
 * segments share one renderer.
 *
 * Two submit paths:
 *   • Create project  → POST /api/projects, which assigns the next available
 *     NW-<SEG>-#### code AT THAT MOMENT (no code is shown or reserved before).
 *   • Save as draft   → POST /api/projects/drafts, storing the half-filled
 *     form so it can be resumed + submitted later. A draft carries no code.
 *
 * The PM can optionally pick a "similar project" reference (same segment) to
 * pre-fill the commercial + segment-specific fields (identity stays blank).
 *
 * Only pm + engineering_manager reach this form (gated on the server page);
 * the APIs re-check the role, so this is defence-in-depth, not the only gate.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Segment } from '@/lib/types';
import { segmentStyle } from '@/lib/segment-style';
import {
  intakeSections,
  segmentBlurb,
  segmentRisks,
  RISK_OPTIONS,
  REFERENCE_SKIP_KEYS,
  type IntakeField,
  type ReferenceProject,
} from '@/lib/intake-config';

const INPUT =
  'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20';

type Result = { id: string; code: string } | null;

export function IntakeForm({
  token,
  segment,
  references = [],
  initialValues,
  initialRefCode = '',
  draftId: initialDraftId,
}: {
  token: string;
  segment: Segment;
  references?: ReferenceProject[];
  initialValues?: Record<string, string>;
  initialRefCode?: string;
  draftId?: string;
}) {
  const router = useRouter();
  const style = segmentStyle(segment);
  const sections = intakeSections(segment);
  const risks = segmentRisks(segment);

  // All field keys valid for this segment — used to filter what a reference copies.
  const allowedKeys = useMemo(
    () => new Set(sections.flatMap((s) => s.fields.map((f) => f.key))),
    [sections],
  );

  const [values, setValues] = useState<Record<string, string>>(initialValues ?? { start_week: '0' });
  const [refCode, setRefCode] = useState(initialRefCode);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [submitting, setSubmitting] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  function set(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setDraftSaved(false);
  }

  function chooseReference(code: string) {
    setRefCode(code);
    setDraftSaved(false);
    if (!code) return;
    const ref = references.find((r) => r.code === code);
    if (!ref) return;
    setValues((prev) => {
      const next = { ...prev };
      // Copy STRUCTURE only — not the headline dollar amounts. The new deal's
      // contract value / budget / contingency are entered fresh each time.
      if (ref.hard_deadline_description) next.deadline_gate = ref.hard_deadline_description;
      if (ref.intake_json && typeof ref.intake_json === 'object') {
        for (const [k, v] of Object.entries(ref.intake_json)) {
          if (k === 'risks' || REFERENCE_SKIP_KEYS.has(k) || !allowedKeys.has(k)) continue;
          if (typeof v === 'string') next[k] = v;
        }
        // Copy risk treatments (status per known risk area) where they match.
        const refRisks = (ref.intake_json as { risks?: Array<{ area?: string; status?: string }> }).risks;
        if (Array.isArray(refRisks)) {
          const byArea = new Map(refRisks.map((r) => [r.area, r.status]));
          risks.forEach((area, i) => {
            const st = byArea.get(area);
            if (typeof st === 'string' && st) next[`risk_${i}`] = st;
          });
        }
      }
      return next;
    });
  }

  const requiredKeys = sections.flatMap((s) => s.fields.filter((f) => f.required).map((f) => f.key));

  async function saveDraft() {
    setError(null);
    setDraftSaving(true);
    try {
      const res = await fetch('/api/projects/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          segment,
          draft_id: draftId,
          name: values.name ?? '',
          payload: { values, refCode },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Could not save the draft.');
      } else {
        setDraftId(json.id);
        setDraftSaved(true);
      }
    } catch {
      setError('Network error — could not save the draft.');
    }
    setDraftSaving(false);
  }

  async function discardDraft() {
    if (!draftId) {
      router.push(`/intake`);
      return;
    }
    await fetch(`/api/projects/drafts?token=${encodeURIComponent(token)}&id=${encodeURIComponent(draftId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    router.push(`/intake`);
  }

  async function submit() {
    const missing = requiredKeys.filter((k) => !values[k]?.trim());
    if (missing.length > 0) {
      setError('Please fill the required fields (marked *) before creating the project.');
      return;
    }
    setError(null);
    setSubmitting(true);

    // Split core fields (typed columns) from the rest (intake_json).
    const coreByKey: Record<string, string> = {};
    const intake: Record<string, unknown> = {};
    for (const section of sections) {
      for (const f of section.fields) {
        const raw = values[f.key];
        if (raw === undefined || raw === '') continue;
        if (f.core) coreByKey[f.core] = raw;
        else intake[f.key] = raw;
      }
    }
    intake.risks = risks.map((area, i) => ({ area, status: values[`risk_${i}`] || '' }));
    if (refCode) intake.reference_project_code = refCode;

    const num = (v?: string) => (v && v.trim() ? Number(v) : 0);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          segment,
          name: coreByKey.name,
          client: coreByKey.client,
          contract_value: num(coreByKey.contract_value),
          approved_budget: num(coreByKey.approved_budget),
          contingency: num(coreByKey.contingency),
          start_week: Math.trunc(num(coreByKey.start_week)),
          hard_deadline: coreByKey.hard_deadline ?? null,
          intake,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Could not create the project.');
        setSubmitting(false);
        return;
      }
      // Submitted from a draft — clean it up so it stops showing in "resume".
      if (draftId) {
        await fetch(`/api/projects/drafts?token=${encodeURIComponent(token)}&id=${encodeURIComponent(draftId)}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
      setResult(json.project as { id: string; code: string });
    } catch {
      setError('Network error — could not reach the server.');
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className={`mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${style.badge}`}>
          ✓
        </div>
        <h1 className="text-xl font-semibold">Project created</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The system assigned code <span className="font-mono font-medium text-foreground">{result.code}</span>.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href={`/projects/${result.code}`}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Open the project →
          </Link>
          <Link
            href={`/intake`}
            className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Create another
          </Link>
        </div>
        <p className="mx-auto mt-6 max-w-md text-xs text-muted-foreground">
          Next, open the project and use the planning agents (Charter → WBS → Schedule → Budget) to build out the rest.
        </p>
      </div>
    );
  }

  const hasFullSheet = (r: ReferenceProject) =>
    !!r.intake_json && typeof r.intake_json === 'object' && Object.keys(r.intake_json).length > 0;
  const sortedRefs = [...references].sort(
    (a, b) => Number(hasFullSheet(b)) - Number(hasFullSheet(a)) || a.name.localeCompare(b.name),
  );
  const fullCount = references.filter(hasFullSheet).length;
  const plannedEnd = (() => {
    const start = values.ntp_date;
    const wks = Number(values.target_duration_weeks);
    if (!start || !wks || wks <= 0) return null;
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + Math.round(wks * 7));
    return d.toISOString().slice(0, 10);
  })();
  const chosen = refCode ? references.find((r) => r.code === refCode) : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      {/* header */}
      <div className="mb-6">
        <Link href={`/intake`} className="text-xs text-muted-foreground transition hover:text-foreground">
          ← All segments
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}>
            {style.label}
          </span>
          <h1 className="text-2xl font-bold tracking-tight">New {style.label.toLowerCase()} project</h1>
          {draftId && (
            <span className="inline-flex items-center rounded-full border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Draft
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{segmentBlurb(segment)}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          A project code is assigned automatically when you click <span className="font-medium text-foreground">Create project</span> — not before.
        </div>
      </div>

      {/* reference picker */}
      {references.length > 0 && (
        <section className="mb-6 rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Start from a similar project (optional)</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick a comparable {style.label.toLowerCase()} project to pre-fill the contract structure, technical facts, and
            risk treatments. The contract value, budget and identity stay blank for you to enter; everything is editable,
            and the reference is recorded for the Charter agent to use later.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className={`${INPUT} sm:max-w-md`}
              value={refCode}
              onChange={(e) => chooseReference(e.target.value)}
            >
              <option value="">No reference — start blank</option>
              {sortedRefs.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name} — {r.code}
                  {hasFullSheet(r) ? '  ·  full data sheet' : '  ·  facts only'}
                </option>
              ))}
            </select>
            {chosen && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}>
                Pre-filled from {chosen.code}
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {fullCount > 0
              ? `${fullCount} project${fullCount === 1 ? '' : 's'} here ${fullCount === 1 ? 'was' : 'were'} created through this form ("full data sheet") and pre-fill the most. "Facts only" are seeded projects that carry just headline facts.`
              : 'No projects in this segment have a full data sheet yet — they pre-fill only headline facts. Create one through this form to build a richer reference for next time.'}
          </p>
        </section>
      )}

      {/* sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            {section.blurb && <p className="mt-0.5 text-xs text-muted-foreground">{section.blurb}</p>}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.fields.map((f) => (
                <Field
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ''}
                  onChange={(v) => set(f.key, v)}
                  suggestion={f.key === 'hard_deadline' ? plannedEnd : undefined}
                  onUseSuggestion={
                    f.key === 'hard_deadline' && plannedEnd ? () => set('hard_deadline', plannedEnd) : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))}

        {/* risk confirmations */}
        <section className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">6. Known {style.label.toLowerCase()} risk areas to confirm</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            For each typical risk, set its status. Owner-side means the customer carries it.
          </p>
          <div className="mt-4 space-y-2">
            {risks.map((area, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">{area}</span>
                <select
                  className={`${INPUT} sm:w-64`}
                  value={values[`risk_${i}`] ?? ''}
                  onChange={(e) => set(`risk_${i}`, e.target.value)}
                >
                  <option value="">Select…</option>
                  {RISK_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* footer / submit */}
      {error && (
        <p className="mt-5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="sticky bottom-0 mt-5 flex flex-col gap-3 border-t bg-background/90 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Fields marked * are required to create. A draft saves anything.</span>
          {draftSaved && <span className="font-medium text-emerald-700">Draft saved ✓</span>}
        </div>
        <div className="flex items-center gap-2">
          {draftId && (
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-red-600"
            >
              Discard draft
            </button>
          )}
          <button
            type="button"
            disabled={draftSaving || submitting}
            onClick={saveDraft}
            className="rounded-md border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {draftSaving ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            type="button"
            disabled={submitting || draftSaving}
            onClick={submit}
            className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
  suggestion,
  onUseSuggestion,
}: {
  field: IntakeField;
  value: string;
  onChange: (v: string) => void;
  suggestion?: string | null;
  onUseSuggestion?: () => void;
}) {
  const label = (
    <label className="mb-1 block text-xs font-medium text-foreground">
      {field.label}
      {field.required && <span className="text-red-600"> *</span>}
    </label>
  );
  const hint = field.hint ? <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p> : null;
  const wrap = field.wide ? 'sm:col-span-2' : '';

  if (field.type === 'select') {
    return (
      <div className={wrap}>
        {label}
        <select className={INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {hint}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className={wrap}>
        {label}
        <textarea className={`${INPUT} min-h-[72px] resize-y`} value={value} onChange={(e) => onChange(e.target.value)} />
        {hint}
      </div>
    );
  }

  const inputType = field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'money' ? 'number' : 'text';
  return (
    <div className={wrap}>
      {label}
      <div className="relative">
        {field.type === 'money' && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        )}
        <input
          type={inputType}
          inputMode={field.type === 'money' || field.type === 'number' ? 'decimal' : undefined}
          className={`${INPUT} ${field.type === 'money' ? 'pl-7' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {hint}
      {suggestion && suggestion !== value && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Planned completion ≈{' '}
          <span className="font-medium text-foreground">
            {new Date(suggestion).toLocaleDateString()}
          </span>{' '}
          (from NTP + duration).
          {onUseSuggestion && (
            <button
              type="button"
              onClick={onUseSuggestion}
              className="ml-1 underline transition hover:text-foreground"
            >
              use as deadline
            </button>
          )}
        </p>
      )}
    </div>
  );
}
