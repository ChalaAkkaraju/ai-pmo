'use client';

/**
 * Richer analytics visuals — hand-built SVG/CSS (no charting library, to match
 * the existing hero SegmentDonut). DonutPanel for composition, TreemapPanel for
 * many-category weight (HTML/CSS so labels stay crisp), RiskMatrix for the 3x3
 * probability x impact grid. All take { label, count }[] rows.
 */

export interface Row {
  label: string;
  count: number;
}

const PALETTE = [
  '#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#10b981', '#f97316', '#ec4899', '#84cc16', '#06b6d4', '#a855f7',
  '#64748b',
];

const SEMANTIC: Record<string, string> = {
  Open: '#6366f1', Active: '#0ea5e9', Mitigated: '#10b981',
  Realised: '#f59e0b', 'Not materialised': '#94a3b8',
  High: '#ef4444', Medium: '#f59e0b', Low: '#94a3b8',
  Acknowledged: '#6366f1', 'In progress': '#0ea5e9', Done: '#10b981',
  Resolved: '#10b981', Closed: '#94a3b8',
};

function colorFor(label: string, i: number): string {
  return SEMANTIC[label] ?? PALETTE[i % PALETTE.length];
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b bg-muted/40 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/* ------------------------------- DonutPanel ------------------------------- */

export function DonutPanel({
  title,
  rows,
  centerLabel = 'total',
}: {
  title: string;
  rows: Row[];
  centerLabel?: string;
}) {
  const data = rows.filter((r) => r.count > 0);
  const total = data.reduce((s, d) => s + d.count, 0);
  const size = 150;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const innerR = 38;

  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const frac = total > 0 ? d.count / total : 0;
    const a0 = angle;
    const a1 = angle + frac * 2 * Math.PI;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const a1draw = frac >= 0.9999 ? a1 - 0.0001 : a1;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1draw), y1 = cy + r * Math.sin(a1draw);
    const xi0 = cx + innerR * Math.cos(a1draw), yi0 = cy + innerR * Math.sin(a1draw);
    const xi1 = cx + innerR * Math.cos(a0), yi1 = cy + innerR * Math.sin(a0);
    const path = [
      `M ${x0} ${y0}`,
      `A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`,
      `L ${xi0} ${yi0}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1}`,
      'Z',
    ].join(' ');
    return { ...d, path, fill: colorFor(d.label, i), pct: Math.round(frac * 100) };
  });

  return (
    <Card title={title}>
      <div className="flex items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none">
          {slices.map((sl) => (
            <path key={sl.label} d={sl.path} fill={sl.fill} stroke="white" strokeWidth={2}>
              <title>{`${sl.label}: ${sl.count} (${sl.pct}%)`}</title>
            </path>
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" style={{ fontSize: 22, fontWeight: 700 }}>
            {total.toLocaleString()}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {centerLabel}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-1">
          {slices.map((sl) => (
            <li key={sl.label} className="flex items-center gap-2 text-[12px]">
              <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: sl.fill }} />
              <span className="min-w-0 flex-1 truncate">{sl.label}</span>
              <span className="tabular-nums font-medium">{sl.count}</span>
              <span className="w-9 text-right tabular-nums text-muted-foreground">{sl.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ------------------------------ TreemapPanel ------------------------------ */
// HTML/CSS treemap so labels render crisply at any box size.

interface TreemapTile extends Row {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

function layoutTreemap(rows: Row[]): TreemapTile[] {
  const data = rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const tiles: TreemapTile[] = [];
  const targetRows = Math.max(1, Math.round(Math.sqrt(data.length)));
  const perRow = Math.ceil(data.length / targetRows);
  let y = 0;
  let i = 0;
  while (i < data.length) {
    const rowItems = data.slice(i, i + perRow);
    const rowSum = rowItems.reduce((s, d) => s + d.count, 0) || 1;
    const rowH = (rowSum / total) * 100;
    let x = 0;
    for (const d of rowItems) {
      const w = (d.count / rowSum) * 100;
      tiles.push({ ...d, x, y, w, h: rowH, fill: '' });
      x += w;
    }
    y += rowH;
    i += rowItems.length;
  }
  tiles.forEach((t, idx) => { t.fill = colorFor(t.label, idx); });
  return tiles;
}

export function TreemapPanel({ title, rows, height = 180 }: { title: string; rows: Row[]; height?: number }) {
  const tiles = layoutTreemap(rows);
  const total = rows.reduce((s, r) => s + r.count, 0);

  if (tiles.length === 0) {
    return (
      <Card title={title}>
        <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
      </Card>
    );
  }

  return (
    <Card title={title}>
      <div className="relative w-full overflow-hidden rounded-md" style={{ height }}>
        {tiles.map((t) => {
          const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
          const big = t.w > 14 && t.h > 18;
          return (
            <div
              key={t.label}
              className="absolute overflow-hidden p-1.5 text-white"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                width: `calc(${t.w}% - 3px)`,
                height: `calc(${t.h}% - 3px)`,
                backgroundColor: t.fill,
                borderRadius: 4,
              }}
              title={`${t.label}: ${t.count} (${pct}%)`}
            >
              {big && (
                <>
                  <p className="truncate text-[11px] font-semibold leading-tight">{t.label}</p>
                  <p className="text-[11px] leading-tight opacity-90">{t.count} · {pct}%</p>
                </>
              )}
            </div>
          );
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {tiles.map((t) => (
          <li key={t.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 flex-none rounded-sm" style={{ backgroundColor: t.fill }} />
            <span className="truncate">{t.label}</span>
            <span className="tabular-nums font-medium text-foreground">{t.count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ----------------------------- RankedBarPanel ----------------------------- */
// Polished ranked horizontal bars — readable for many categories (where a
// treemap gets cramped). Sorted desc, color-coded, with value + % labels.

export function RankedBarPanel({ title, rows }: { title: string; rows: Row[] }) {
  const data = rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));

  if (data.length === 0) {
    return (
      <Card title={title}>
        <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
      </Card>
    );
  }

  return (
    <Card title={title}>
      <ul className="space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          const widthPct = Math.max(2, Math.round((d.count / max) * 100));
          const fill = colorFor(d.label, i);
          return (
            <li key={d.label} className="flex items-center gap-2 text-[12px]">
              <span className="w-36 flex-none truncate" title={d.label}>{d.label}</span>
              <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted/50">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${widthPct}%`, backgroundColor: fill }}
                />
              </span>
              <span className="w-7 flex-none text-right font-medium tabular-nums">{d.count}</span>
              <span className="w-9 flex-none text-right tabular-nums text-muted-foreground">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ------------------------------- RiskMatrix ------------------------------- */

const PIL = ['L', 'M', 'H'] as const;
type PI = (typeof PIL)[number];

export function RiskMatrix({ cells }: { cells: Array<{ probability: string; impact: string }> }) {
  const counts: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const idx = (v: string): number => (v === 'H' ? 2 : v === 'M' ? 1 : v === 'L' ? 0 : -1);
  for (const c of cells) {
    const pi = idx(c.probability);
    const ii = idx(c.impact);
    if (pi < 0 || ii < 0) continue;
    counts[pi][ii] += 1;
  }

  function band(pi: number, ii: number): string {
    const score = (pi + 1) * (ii + 1);
    if (score >= 6) return 'bg-red-100 border-red-300 text-red-900';
    if (score >= 3) return 'bg-amber-100 border-amber-300 text-amber-900';
    return 'bg-emerald-100 border-emerald-300 text-emerald-900';
  }
  const label: Record<PI, string> = { H: 'High', M: 'Medium', L: 'Low' };

  return (
    <Card title="Probability × impact matrix">
      <div className="flex gap-2">
        <div className="flex items-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] rotate-180">
            Probability
          </span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1">
            {(['H', 'M', 'L'] as PI[]).map((p) => {
              const pi = idx(p);
              return (
                <FragmentRow key={p}>
                  <div className="flex items-center justify-end pr-1 text-[10px] font-medium text-muted-foreground">
                    {label[p]}
                  </div>
                  {(['L', 'M', 'H'] as PI[]).map((im) => {
                    const ii = idx(im);
                    const n = counts[pi][ii];
                    return (
                      <div
                        key={im}
                        className={`flex h-11 items-center justify-center rounded border text-sm font-semibold ${band(pi, ii)} ${n === 0 ? 'opacity-40' : ''}`}
                        title={`Probability ${label[p]} × Impact ${label[im]}: ${n}`}
                      >
                        {n}
                      </div>
                    );
                  })}
                </FragmentRow>
              );
            })}
            <div />
            {(['L', 'M', 'H'] as PI[]).map((im) => (
              <div key={im} className="pt-1 text-center text-[10px] font-medium text-muted-foreground">
                {label[im]}
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Impact
          </p>
        </div>
      </div>
    </Card>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
