/**
 * The capital asset chain as five links:
 *   Appropriated -> Committed -> Actual -> Settled to AuC -> Capitalised
 * Each link shows its amount and a bar scaled to the appropriation; the gap
 * to the next link is labelled, because the gaps are where control fails.
 * Server-renderable (no client state).
 */

import type { AssetChain } from '@/lib/capital';
import { fmtMoneyCap } from '@/lib/capital';

export function CapitalChain({ chain, eac = null, compact = false }: { chain: AssetChain; eac?: number | null; compact?: boolean }) {
  const base = Math.max(chain.appropriated, chain.committed, Number(eac ?? 0), 1);
  const links = [
    { key: 'appropriated', label: 'Appropriated', value: chain.appropriated, sub: chain.supplementary > 0 ? `AFE ${fmtMoneyCap(chain.afe_original)} + supp. ${fmtMoneyCap(chain.supplementary)}` : 'AFE sanctioned', cls: 'bg-slate-700' },
    { key: 'committed', label: 'Committed', value: chain.committed, sub: `${fmtMoneyCap(chain.open_commitment)} open POs`, cls: chain.committed > chain.appropriated ? 'bg-red-500' : 'bg-blue-600' },
    { key: 'actual', label: 'Actual', value: chain.actual, sub: 'posted in SAP PS', cls: 'bg-sky-500' },
    { key: 'auc', label: 'Settled to AuC', value: chain.settled_to_auc, sub: `${fmtMoneyCap(chain.expensed)} expensed`, cls: 'bg-teal-500' },
    { key: 'cap', label: 'Capitalised', value: chain.capitalised, sub: chain.auc_balance > 0 ? `${fmtMoneyCap(chain.auc_balance)} still in AuC` : 'on the register', cls: 'bg-emerald-600' },
  ];
  const gaps = [
    chain.committed > chain.appropriated ? { tone: 'bad', text: `${fmtMoneyCap(chain.committed - chain.appropriated)} committed beyond the AFE` } : null,
    null,
    chain.unsettled > 0 ? { tone: chain.actual > 0 && chain.unsettled / chain.actual > 0.15 ? 'warn' : 'muted', text: `${fmtMoneyCap(chain.unsettled)} not settled` } : null,
    chain.auc_balance > 0 ? { tone: 'muted', text: `${fmtMoneyCap(chain.auc_balance)} in AuC` } : null,
  ];
  return (
    <div>
      <div className={`grid gap-2 ${compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-5'}`}>
        {links.map((l, i) => (
          <div key={l.key} className="relative rounded-lg border bg-white/80 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{i + 1}. {l.label}</p>
            <p className={`mt-1 font-semibold tabular-nums ${compact ? 'text-base' : 'text-xl'}`}>{fmtMoneyCap(l.value)}</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={`h-full ${l.cls}`} style={{ width: `${Math.min(100, (l.value / base) * 100)}%` }} /></div>
            <p className="mt-1 text-[10px] text-muted-foreground">{l.sub}</p>
            {i < links.length - 1 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-muted-foreground sm:block" aria-hidden>›</span>}
          </div>
        ))}
      </div>
      <div className={`mt-1.5 grid gap-2 text-[10px] ${compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-5'}`}>
        {gaps.map((g, i) => (
          <p key={i} className={`text-right ${g?.tone === 'bad' ? 'font-semibold text-red-700' : g?.tone === 'warn' ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}>{g ? `${g.text} →` : ''}</p>
        ))}
        <p className="text-right text-muted-foreground">{eac ? `EAC ${fmtMoneyCap(eac)}` : ''}</p>
      </div>
    </div>
  );
}
