'use client';

/**
 * Cost tab shell — splits the (dense) financial content into colour-coded lenses
 * behind a segmented control so only one shows at a time. The set reads as the
 * money story end-to-end:
 *   Cost-to-date · amber   · what we've spent (element mix + WBS-phase recon)
 *   Commitment   · orange  · committed, not yet spent (open POs)
 *   Revenue      · emerald · what we've earned (Results Analysis / IFRS 15 POC)
 *   Cash flow    · sky     · what we're financing (funding-exposure forecast)
 */
import { useState, type ReactNode } from 'react';
import { Receipt, FileSignature, TrendingUp, Waves } from 'lucide-react';

const LENSES = [
  { key: 'cost', label: 'Cost-to-date', hint: 'What we’ve spent', Icon: Receipt, iconOn: 'text-amber-600', activeBtn: 'border-amber-300 bg-amber-50 text-amber-800', edge: 'border-amber-300' },
  { key: 'commitment', label: 'Commitment', hint: 'Committed, not yet spent', Icon: FileSignature, iconOn: 'text-orange-600', activeBtn: 'border-orange-300 bg-orange-50 text-orange-800', edge: 'border-orange-300' },
  { key: 'revenue', label: 'Revenue recognition', hint: 'What we’ve earned', Icon: TrendingUp, iconOn: 'text-emerald-600', activeBtn: 'border-emerald-300 bg-emerald-50 text-emerald-800', edge: 'border-emerald-300' },
  { key: 'cash', label: 'Cash flow', hint: 'What we finance', Icon: Waves, iconOn: 'text-sky-600', activeBtn: 'border-sky-300 bg-sky-50 text-sky-800', edge: 'border-sky-300' },
] as const;

type Lens = (typeof LENSES)[number]['key'];

export function CostTab({ costToDate, commitment, revenue, cashFlow }: { costToDate: ReactNode; commitment: ReactNode; revenue: ReactNode; cashFlow: ReactNode }) {
  const [lens, setLens] = useState<Lens>('cost');
  const active = LENSES.find((l) => l.key === lens)!;
  const body: Record<Lens, ReactNode> = { cost: costToDate, commitment, revenue, cash: cashFlow };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {LENSES.map((l) => {
          const on = lens === l.key;
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => setLens(l.key)}
              className={`group flex items-center gap-2.5 rounded-lg border px-3.5 py-2 text-left transition ${on ? `${l.activeBtn} shadow-sm` : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <l.Icon className={`h-4 w-4 shrink-0 ${on ? l.iconOn : 'text-muted-foreground group-hover:text-foreground'}`} />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">{l.label}</span>
                <span className={`text-[11px] font-normal ${on ? 'opacity-70' : 'text-muted-foreground/70'}`}>{l.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={`space-y-6 border-l-2 pl-5 ${active.edge}`}>{body[lens]}</div>
    </div>
  );
}
