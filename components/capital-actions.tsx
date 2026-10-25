'use client';

/**
 * Raise a capital decision on this project. Only the actions the project's
 * position allows are offered: a study-budget release in FEL1/FEL2, the AFE at
 * the commit gate, a supplementary once an AFE exists, and a hold or a
 * cancellation at any point. Each goes through the authority matrix; the
 * response says whether it was applied or who now has to decide.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { afeAuthority, fmtMoneyCap } from '@/lib/capital';
import { parseMoney } from '@/lib/intake-config';

type Action = 'study_budget' | 'afe' | 'supplementary' | 'hold' | 'cancel';

export function CapitalActions({ projectCode, stageName, isCommitStage, committed, estimate, appropriated, eac, triggerNeeded, onHold, openKinds = [] }: {
  projectCode: string; stageName: string | null; isCommitStage: boolean; committed: boolean;
  estimate: number; appropriated: number; eac: number | null; triggerNeeded: boolean; onHold: boolean;
  /** Decision kinds already open on this project — those actions are not offered twice. */
  openKinds?: string[];
}) {
  const router = useRouter();
  const options: Array<{ key: Action; label: string }> = [];
  const open = new Set(openKinds);
  if (!committed && !isCommitStage && !open.has('gate_decision')) options.push({ key: 'study_budget', label: `Release ${stageName ?? 'FEL'} study budget` });
  if (!committed && isCommitStage && !open.has('afe_approval')) options.push({ key: 'afe', label: 'Request AFE sanction' });
  if (committed && !open.has('supplementary_afe')) options.push({ key: 'supplementary', label: 'Request supplementary AFE' });
  if (!onHold && !open.has('hold')) options.push({ key: 'hold', label: 'Put on hold' });
  if (!open.has('cancel')) options.push({ key: 'cancel', label: 'Cancel project' });

  const [action, setAction] = useState<Action>(triggerNeeded && committed && !open.has('supplementary_afe') ? 'supplementary' : (options[0]?.key ?? 'cancel'));
  const defaultAmount = action === 'afe' ? estimate : action === 'supplementary' ? Math.max(0, Number(eac ?? 0) - appropriated) : Math.round(estimate * 0.03 / 1000) * 1000;
  const [amount, setAmount] = useState<string>('');
  const [text, setText] = useState('');
  const [holdUntil, setHoldUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const amt = amount.trim() ? parseMoney(amount) : defaultAmount;
  const routedOn = action === 'supplementary' ? appropriated + Number(amt ?? 0) : Number(amt ?? 0);
  const authority = action === 'afe' || action === 'supplementary' ? afeAuthority(routedOn) : null;

  async function submit() {
    setBusy(true); setMsg(null);
    const payload: Record<string, unknown> = { project_code: projectCode, action };
    if (action === 'study_budget' || action === 'afe') payload.amount = Number(amt ?? 0);
    if (action === 'supplementary') { payload.increment = Number(amt ?? 0); payload.reason = text; payload.eac = eac; }
    else payload.notes = text || null;
    if (action === 'hold') payload.hold_until = holdUntil;
    try {
      const res = await fetch('/api/capital/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setMsg({ ok: true, text: json.applied ? 'Approved and applied — you hold the authority for this and nothing was outstanding.' : `Raised. It now waits for ${String(json.requires ?? 'the approving body').replace(/_/g, ' ')}${action === 'afe' || action === 'supplementary' ? ', after Finance concurs' : ''}.` });
      setAmount(''); setText('');
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  if (options.length === 0) return null;
  const field = 'mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm';
  return (
    <section className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-5 shadow-sm">
      <h2 className="text-base font-semibold">Raise a decision</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Routed through the delegation of authority. You raise it; the body its size requires decides it.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.key} type="button" onClick={() => { setAction(o.key); setAmount(''); setMsg(null); }} className={`rounded-full border px-3 py-1 text-xs font-medium ${action === o.key ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white hover:bg-muted'}`}>{o.label}</button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {(action === 'study_budget' || action === 'afe' || action === 'supplementary') && (
          <label className="text-xs font-medium text-muted-foreground">{action === 'supplementary' ? 'Increase requested' : action === 'afe' ? 'AFE amount' : 'Study budget'}
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={fmtMoneyCap(defaultAmount)} className={field} />
            <span className="mt-1 block text-[11px] font-normal">
              {action === 'supplementary' ? `Revised total ${fmtMoneyCap(routedOn)} (from ${fmtMoneyCap(appropriated)})` : fmtMoneyCap(Number(amt ?? 0))}
              {authority ? ` · sanctioned by the ${authority.label.toLowerCase()}` : ''}
            </span>
          </label>
        )}
        {action === 'hold' && (
          <label className="text-xs font-medium text-muted-foreground">Hold until<input type="date" value={holdUntil} onChange={(e) => setHoldUntil(e.target.value)} className={field} /></label>
        )}
        <label className={`text-xs font-medium text-muted-foreground ${action === 'hold' || action === 'cancel' ? 'sm:col-span-2' : 'sm:col-span-2'}`}>{action === 'supplementary' ? 'Why the forecast moved (required)' : 'Notes for the decider'}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={field} placeholder={action === 'supplementary' ? 'e.g. Refractory scope found on opening the boiler; vendor quote attached' : action === 'cancel' ? (committed ? 'After the AFE this writes off the AuC balance — Finance concurs.' : 'Stopping in FEL is cheap: the study spend is expensed.') : ''} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || (action === 'supplementary' && !text.trim()) || (action === 'hold' && !holdUntil)} onClick={submit} className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50">{busy ? 'Submitting…' : 'Submit'}</button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
