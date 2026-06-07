/**
 * Billing & revenue — earned vs billed revenue and net unbilled (WIP). Earned
 * revenue is what the work has earned (EV ÷ BAC × contract); billed is what's
 * been invoiced. The gap is net unbilled work-in-progress, or over-billing if
 * billed ahead. The revenue-side number no single system shows. Display only.
 */
import type { BillingSummary } from '@/lib/billing';

function money(n: number): string {
  const m = n / 1_000_000;
  return m >= 0.01 || m <= -0.01 ? `${m < 0 ? '−' : ''}$${Math.abs(m).toFixed(2)}M` : `$${Math.round(n / 1000)}k`;
}
const pct = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(0)}%`);

export function BillingCard({ billing }: { billing: BillingSummary }) {
  if (!billing.ready) {
    return (
      <section className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
        Billing not available yet — needs a contract value and invoices from SAP PS.
      </section>
    );
  }
  const { contractValue, earnedRevenue, billed, netUnbilled, paid, invoiced, earnedPct, billedPct, overBilled, byType } = billing;
  const track = Math.max(contractValue, earnedRevenue, billed, 1);

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <p className="text-sm font-semibold">Billing &amp; revenue</p>
        <p className="text-xs text-muted-foreground">Earned vs billed revenue · {billing.count} invoices · revenue from SAP PS billing</p>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-4">
        <Kpi label="Contract value" value={money(contractValue)} />
        <Kpi label="Earned revenue" value={money(earnedRevenue)} sub={`${pct(earnedPct)} of contract`} accent="#10b981" />
        <Kpi label="Billed to date" value={money(billed)} sub={`${pct(billedPct)} · ${money(paid)} paid`} accent="#3b82f6" />
        <Kpi
          label={overBilled ? 'Over-billed' : 'Net unbilled (WIP)'}
          value={money(Math.abs(netUnbilled))}
          sub={overBilled ? 'billed ahead of earned' : 'earned, not yet billed'}
          cls={overBilled ? 'text-red-600' : 'text-amber-700'}
        />
      </div>

      {/* Earned vs billed bars against the contract track */}
      <div className="space-y-2 border-t px-5 py-4">
        <Bar label="Earned" value={earnedRevenue} track={track} color="#10b981" caption={money(earnedRevenue)} />
        <Bar label="Billed" value={billed} track={track} color="#3b82f6" caption={`${money(billed)} (${money(invoiced)} invoiced · ${money(paid)} paid)`} />
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="w-14 shrink-0">Contract</span>
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
          <span className="w-44 shrink-0 text-right font-mono">{money(contractValue)}</span>
        </div>
      </div>

      {byType.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t px-5 py-3 text-[11px]">
          <span className="text-muted-foreground">By type:</span>
          {byType.map((t) => (
            <span key={t.type} className="rounded-full bg-muted px-2 py-0.5 font-medium">{t.type} <span className="font-mono text-muted-foreground">{money(t.amount)}</span></span>
          ))}
        </div>
      )}
    </section>
  );
}

function Bar({ label, value, track, color, caption }: { label: string; value: number; track: number; color: string; caption: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / track) * 100)}%`, backgroundColor: color }} />
      </div>
      <span className="w-44 shrink-0 text-right font-mono text-xs">{caption}</span>
    </div>
  );
}

function Kpi({ label, value, sub, cls = 'text-foreground', accent }: { label: string; value: string; sub?: string; cls?: string; accent?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2" style={accent ? { backgroundColor: `${accent}14` } : undefined}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
