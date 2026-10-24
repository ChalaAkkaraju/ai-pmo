'use client';

/** Search box for the IT portfolio — same look as the revenue dashboard's, filters client-side. */

import { useState } from 'react';
import Link from 'next/link';
import { bucketLabel, categoryLabel, lifecycleLabel } from '@/lib/it-portfolio';

export function ItProjectSearch({ projects }: { projects: Array<{ code: string; name: string; portfolio_bucket: string | null; project_category: string | null; lifecycle_status: string | null; fiscal_year: number | null; client?: string | null }> }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const needle = q.trim().toLowerCase();
  const hits = needle ? projects.filter((p) => [p.code, p.name, p.portfolio_bucket, p.project_category, p.lifecycle_status, p.client].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle))).slice(0, 8) : [];
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base">🔎</span>
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search IT projects — try a code (NW-IT-0007), a name, a bucket (security) or a category (deployment…)"
        className="w-full rounded-md border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" aria-label="Search IT projects" />
      {q && <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-slate-100 hover:text-foreground">Clear</button>}
      {focused && needle && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-card shadow-lg">
          {hits.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">No IT project matches “{q}”.</p> : (
            <ul>{hits.map((p) => (
              <li key={p.code}><Link href={`/projects/${encodeURIComponent(p.code)}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-muted/60">
                <span className="min-w-0"><span className="font-medium">{p.name}</span> <span className="font-mono text-[11px] text-muted-foreground">{p.code}</span><span className="block text-[11px] text-muted-foreground">{bucketLabel(p.portfolio_bucket)} · {categoryLabel(p.project_category)}{p.fiscal_year ? ` · FY${p.fiscal_year}` : ''}</span></span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{lifecycleLabel(p.lifecycle_status as never)}</span>
              </Link></li>
            ))}</ul>
          )}
        </div>
      )}
    </div>
  );
}
