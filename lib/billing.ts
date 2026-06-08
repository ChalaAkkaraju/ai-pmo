/**
 * Billing analytics — earned vs billed revenue and net unbilled (WIP). Pure
 * computation, no I/O. Earned revenue is what the work has earned in revenue
 * terms (EV ÷ BAC × contract); billed is what's been invoiced. The gap is net
 * unbilled work-in-progress (positive) or over-billing / advances (negative).
 */

const n = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export interface BillingRow {
  wbs_code?: string | null;
  invoice_number?: string | null;
  billing_type?: string | null;
  amount?: number | string | null;
  billed_week?: number | string | null;
  status?: string | null;
}

export interface BillingSummary {
  contractValue: number;
  billed: number;            // Σ invoiced + paid
  invoiced: number;          // not yet paid
  paid: number;
  billedPct: number | null;  // billed ÷ contract
  byType: { type: string; amount: number }[];
  byPhase: { phase: string; amount: number }[];
  count: number;
  ready: boolean;
}

const branchOf = (wbs: string | null | undefined) => {
  const p = String(wbs ?? '').split('.');
  return p.length >= 2 ? `${p[0]}.${p[1]}` : String(wbs ?? '');
};

/** Billed-only — invoices raised. Recognised revenue lives in Results Analysis
 *  (lib/results-analysis), kept independent of earned value. */
export function computeBilling(rows: BillingRow[], contractValue: number): BillingSummary {
  let invoiced = 0, paid = 0;
  const byType = new Map<string, number>();
  const byPhase = new Map<string, number>();
  for (const b of rows) {
    const amt = n(b.amount);
    const st = String(b.status ?? '');
    if (st === 'Paid') paid += amt; else if (st === 'Invoiced') invoiced += amt; else continue; // ignore Planned
    byType.set(b.billing_type ?? 'Progress', (byType.get(b.billing_type ?? 'Progress') ?? 0) + amt);
    const ph = branchOf(b.wbs_code);
    if (ph) byPhase.set(ph, (byPhase.get(ph) ?? 0) + amt);
  }
  const billed = invoiced + paid;
  return {
    contractValue,
    billed,
    invoiced,
    paid,
    billedPct: contractValue > 0 ? billed / contractValue : null,
    byType: [...byType.entries()].map(([type, amount]) => ({ type, amount })).sort((a, b) => b.amount - a.amount),
    byPhase: [...byPhase.entries()].map(([phase, amount]) => ({ phase, amount })).sort((a, b) => a.phase.localeCompare(b.phase)),
    count: rows.length,
    ready: contractValue > 0 && rows.length > 0,
  };
}
