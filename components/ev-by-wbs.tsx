/**
 * Earned value by WBS branch — where in the structure the cost/schedule
 * performance sits. One row per top-level branch: BAC/EV/AC, CPI/SPI, the
 * dollar variances, and a RAG status flagging the worst dimension. The
 * canonical WBS code is the join key across all three systems.
 */
import type { EvBranch } from '@/lib/earned-value';

function money(n: number): string {
  const m = n / 1_000_000;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(2)}M`;
}
function signed(n: number): string {
  const m = n / 1_000_000;
  return `${n < 0 ? '−' : '+'}$${Math.abs(m).toFixed(2)}M`;
}
function idx(n: number | null): string {
  return n == null ? '—' : n.toFixed(2);
}

const STATUS: Record<EvBranch['status'], { label: string; cls: string; bar: string }> = {
  over: { label: 'Over cost', cls: 'bg-red-100 text-red-700', bar: 'bg-red-400' },
  behind: { label: 'Behind', cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  watch: { label: 'Watch', cls: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-400' },
  ok: { label: 'On track', cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' },
};

function tone(n: number | null): string {
  return n == null ? 'text-foreground' : n < 0.95 ? 'text-red-600' : n >= 1.0 ? 'text-emerald-700' : 'text-amber-700';
}

export function EvByWbs({ branches }: { branches: EvBranch[] }) {
  const rows = branches.filter((b) => b.bac > 0);
  if (rows.length === 0) return null;
  const flagged = rows.filter((b) => b.status === 'over' || b.status === 'behind').length;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Earned value by WBS branch</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Cost and schedule performance per top-level branch — worst cost variance first.</p>
        </div>
        {flagged > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">{flagged} branch{flagged === 1 ? '' : 'es'} off track</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Branch</th>
              <th className="px-3 py-2 text-right">BAC</th>
              <th className="px-3 py-2 text-right">EV</th>
              <th className="px-3 py-2 text-right">AC</th>
              <th className="px-3 py-2 text-center">CPI</th>
              <th className="px-3 py-2 text-center">SPI</th>
              <th className="px-3 py-2 text-right">CV</th>
              <th className="px-3 py-2 text-right">SV</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((b) => {
              const st = STATUS[b.status];
              return (
                <tr key={b.branch} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground">{b.branch}</span> {b.name}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(b.bac)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(b.ev)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(b.ac)}</td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${tone(b.cpi)}`}>{idx(b.cpi)}</td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${tone(b.spi)}`}>{idx(b.spi)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${b.cv < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{signed(b.cv)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono text-xs ${b.sv < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{signed(b.sv)}</td>
                  <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${st.bar}`} />{st.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
