'use client';

/**
 * Risks & issues tab shell — splits the (long) risk and issue sections behind a
 * segmented control so only one shows at a time:
 *   Risks  · red    · threats, EMV exposure, heatmap, register
 *   Issues · amber  · open problems, health, severity×age, register
 * Mirrors the Cost tab's lens pattern.
 */
import { useState, type ReactNode } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

const LENSES = [
  { key: 'risks', label: 'Risks', hint: 'Threats & exposure', Icon: ShieldAlert, iconOn: 'text-red-600', activeBtn: 'border-red-300 bg-red-50 text-red-800', edge: 'border-red-300' },
  { key: 'issues', label: 'Issues', hint: 'Open problems', Icon: AlertTriangle, iconOn: 'text-amber-600', activeBtn: 'border-amber-300 bg-amber-50 text-amber-800', edge: 'border-amber-300' },
] as const;

type Lens = (typeof LENSES)[number]['key'];

export function RiskIssuesTab({ risks, issues }: { risks: ReactNode; issues: ReactNode }) {
  const [lens, setLens] = useState<Lens>('risks');
  const active = LENSES.find((l) => l.key === lens)!;
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
      <div className={`space-y-6 border-l-2 pl-5 ${active.edge}`}>{lens === 'risks' ? risks : issues}</div>
    </div>
  );
}
