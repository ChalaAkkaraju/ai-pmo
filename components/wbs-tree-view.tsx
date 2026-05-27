'use client';

/**
 * WBS visualisation — parses the wbs_builder agent's markdown to extract WBS
 * codes (1.0 → 1.1 → 1.1.1 …) and renders them above the full markdown on
 * the WBS tab.
 *
 * Render modes:
 *   1. Card-grid (flat data) — items grouped by inferred category from title
 *      prefix (split on " — ", " - ", or ": "), each group as a coloured card.
 *      Used when the WBS is essentially flat (only one decomposition level).
 *   2. Tree (hierarchical data) — Level-1 branches render as coloured cards
 *      in a 2-column grid, with Level-2+ work packages listed inside.
 *      Used when the WBS has 2+ levels of true decomposition.
 *
 * Parser highlights:
 *   - Section-aware: only reads WBS items inside §2 "WBS structure", so
 *     §3 dictionary entries and §4 convention list items don't bleed in
 *   - Project-root demotion: if there's a single L1 wrapper (e.g. "1 Mesa
 *     Grande Energy Center Phase 1") with many descendants, promote the
 *     descendants to be the new top level
 *   - Strips bold/italic markers, "(at draft stage <anything>)" wrappers,
 *     "[NEEDS PM REVIEW: <note>]" brackets (note extracted to a pill),
 *     "(committed)" tags, trailing periods and em-dashes
 *   - Common-prefix detection (e.g. "2." stripped when all codes share it)
 */

import { useMemo, useState } from 'react';

interface WbsItem {
  code: string;
  level: number;
  title: string;
  needsReview: boolean;
  reviewNote?: string;
  category: string;
  hasChildren?: boolean;
}

interface CategoryGroup {
  category: string;
  colour: CategoryColour;
  items: WbsItem[];
}

interface CategoryColour {
  bg: string;
  border: string;
  chip: string;
  dot: string;
  text: string;
}

const PALETTE: CategoryColour[] = [
  { bg: 'bg-emerald-50', border: 'border-emerald-200', chip: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  { bg: 'bg-sky-50',     border: 'border-sky-200',     chip: 'bg-sky-100 text-sky-800',         dot: 'bg-sky-500',     text: 'text-sky-700' },
  { bg: 'bg-amber-50',   border: 'border-amber-200',   chip: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500',   text: 'text-amber-700' },
  { bg: 'bg-violet-50',  border: 'border-violet-200',  chip: 'bg-violet-100 text-violet-800',   dot: 'bg-violet-500',  text: 'text-violet-700' },
  { bg: 'bg-pink-50',    border: 'border-pink-200',    chip: 'bg-pink-100 text-pink-800',       dot: 'bg-pink-500',    text: 'text-pink-700' },
  { bg: 'bg-teal-50',    border: 'border-teal-200',    chip: 'bg-teal-100 text-teal-800',       dot: 'bg-teal-500',    text: 'text-teal-700' },
  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  chip: 'bg-indigo-100 text-indigo-800',   dot: 'bg-indigo-500',  text: 'text-indigo-700' },
  { bg: 'bg-rose-50',    border: 'border-rose-200',    chip: 'bg-rose-100 text-rose-800',       dot: 'bg-rose-500',    text: 'text-rose-700' },
];

const WBS_LINE = /^[\s]*[-*#]*\s*\**\s*(\d+(?:\.\d+){0,5})[:\.]?\s+(.+?)\s*$/;

function deriveCategory(title: string): string {
  for (const sep of [' — ', ' – ', ' - ', ': ']) {
    const i = title.indexOf(sep);
    if (i > 2 && i < 50) return title.slice(0, i).trim();
  }
  const words = title.split(/\s+/);
  return words.slice(0, Math.min(2, words.length)).join(' ');
}

function isWbsStructureHeading(line: string): boolean {
  return /^#{1,6}\s.*wbs\s+structure/i.test(line) || /^\*\*[^*]*wbs\s+structure[^*]*\*\*\s*$/i.test(line);
}

function isPostWbsHeading(line: string): boolean {
  return /^#{1,6}\s.*(?:wbs\s+dictionary|wbs\s+conventions|notes?\s+for|references?\s*$)/i.test(line) ||
    /^\*\*[^*]*(?:wbs\s+dictionary|wbs\s+conventions|notes?\s+for|references?)[^*]*\*\*\s*$/i.test(line);
}

function parseWbs(markdown: string): WbsItem[] {
  if (!markdown) return [];

  type RawItem = { code: string; title: string; needsReview: boolean; reviewNote?: string };
  const raw: RawItem[] = [];
  const seenCodes = new Set<string>();

  const lines = markdown.split('\n');

  // Pre-scan: does the markdown contain a "WBS structure" heading? If yes,
  // we'll scope parsing to that section only. If not, scan everything.
  const hasWbsHeading = lines.some(isWbsStructureHeading);
  let inWbsSection = !hasWbsHeading; // if no heading exists, start "inside"

  for (const rawLine of lines) {
    if (hasWbsHeading) {
      if (isWbsStructureHeading(rawLine)) {
        inWbsSection = true;
        continue;
      }
      if (inWbsSection && isPostWbsHeading(rawLine)) {
        inWbsSection = false;
        continue;
      }
      if (!inWbsSection) continue;
    }

    const m = WBS_LINE.exec(rawLine);
    if (!m) continue;
    const rawCode = m[1];
    let title = m[2];

    const reviewMatch = /\[NEEDS\s+PM\s+REVIEW:?\s*([^\]]+)\]/i.exec(title);
    const needsReview = !!reviewMatch;
    const reviewNote = reviewMatch?.[1]?.trim();

    title = title
      .replace(/\*\*/g, '')
      .replace(/\*?\(at\s+draft\s+stage[^)]*\)\*?/gi, '')
      .replace(/\[NEEDS\s+PM\s+REVIEW:?[^\]]+\]/gi, '')
      .replace(/\*?\(committed[^)]*\)\*?/gi, '')
      .replace(/\*+/g, '')
      .replace(/[—–-]\s*$/, '')
      .replace(/\.\s*$/, '')
      .trim();

    if (!title) continue;

    const normCode = rawCode.endsWith('.0') ? rawCode.slice(0, -2) : rawCode;
    if (seenCodes.has(normCode)) continue;
    seenCodes.add(normCode);

    raw.push({ code: normCode, title, needsReview, reviewNote });
  }

  if (raw.length === 0) return [];

  // Common-prefix detection across the remaining items.
  const codes = raw.map((r) => r.code);
  const commonPrefix = findCommonNumericPrefix(codes);
  const stripped = commonPrefix
    ? raw.map((r) => ({ ...r, code: r.code.slice(commonPrefix.length) || '0' }))
    : raw;

  let items: WbsItem[] = stripped
    .filter((r) => r.code !== '0' && r.code.length > 0)
    .map((r) => {
      const level = r.code.split('.').length;
      const category = deriveCategory(r.title);
      return { ...r, level, category };
    });

  // Project-root demotion. If exactly one Level-1 item exists AND it has
  // many descendants, treat it as a project-level wrapper and promote its
  // descendants to be the new top level. Common pattern: agent wraps the
  // entire WBS under "1 <Project Name>" before the discipline branches.
  const level1 = items.filter((it) => it.level === 1);
  if (level1.length === 1 && items.length > 5) {
    const rootCode = level1[0].code;
    const rootPrefix = rootCode + '.';
    items = items
      .filter((it) => it.code !== rootCode)
      .map((it) => {
        if (it.code.startsWith(rootPrefix)) {
          return {
            ...it,
            code: it.code.slice(rootPrefix.length),
            level: it.level - 1,
          };
        }
        return it;
      });
  }

  // Compute hasChildren after all code mutations are done.
  for (let i = 0; i < items.length; i++) {
    const me = items[i].code + '.';
    items[i].hasChildren = items.some((o, j) => j !== i && o.code.startsWith(me));
  }

  return items;
}

function findCommonNumericPrefix(codes: string[]): string {
  if (codes.length < 2) return '';
  const firstParts = codes[0].split('.');
  if (firstParts.length < 2) return '';
  const candidate = firstParts[0] + '.';
  return codes.every((c) => c.startsWith(candidate)) ? candidate : '';
}

function groupByCategory(items: WbsItem[]): CategoryGroup[] {
  const groups = new Map<string, WbsItem[]>();
  for (const it of items) {
    const list = groups.get(it.category) ?? [];
    list.push(it);
    groups.set(it.category, list);
  }
  let i = 0;
  return Array.from(groups.entries()).map(([category, list]) => ({
    category,
    items: list,
    colour: PALETTE[i++ % PALETTE.length],
  }));
}

export function WbsTreeView({ markdown }: { markdown: string | null | undefined }) {
  const items = useMemo(() => parseWbs(markdown ?? ''), [markdown]);
  const maxLevel = useMemo(() => items.reduce((m, it) => Math.max(m, it.level), 0), [items]);
  const groups = useMemo(() => groupByCategory(items), [items]);

  if (!markdown) return null;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">WBS structure</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Tree view couldn&apos;t auto-parse this WBS markdown. The full text is shown below.
        </p>
      </div>
    );
  }

  return maxLevel <= 1 ? (
    <WbsCardGrid items={items} groups={groups} />
  ) : (
    <WbsTree items={items} />
  );
}

// =============================================================================
// Card-grid mode (flat data)
// =============================================================================

function WbsCardGrid({ items, groups }: { items: WbsItem[]; groups: CategoryGroup[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const visibleGroups = activeCategory ? groups.filter((g) => g.category === activeCategory) : groups;
  const reviewCount = items.filter((it) => it.needsReview).length;
  const colourByCategory = new Map(groups.map((g) => [g.category, g.colour]));

  return (
    <div className="rounded-lg border bg-card p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">WBS structure</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {items.length} work package{items.length === 1 ? '' : 's'} across {groups.length} categor{groups.length === 1 ? 'y' : 'ies'}.
            {reviewCount > 0 && ` ${reviewCount} flagged for PM review.`}
          </p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
            activeCategory === null ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({items.length})
        </button>
        {groups.map((g) => {
          const isActive = activeCategory === g.category;
          return (
            <button
              key={g.category}
              type="button"
              onClick={() => setActiveCategory(isActive ? null : g.category)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                isActive ? `${g.colour.chip} border-transparent` : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${g.colour.dot}`} />
              <span>{g.category}</span>
              <span className="tabular-nums opacity-70">{g.items.length}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-5">
        {visibleGroups.map((g) => (
          <section key={g.category}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${g.colour.dot}`} />
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${g.colour.text}`}>{g.category}</h4>
              <span className="text-[11px] text-muted-foreground tabular-nums">{g.items.length}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((it) => {
                const c = colourByCategory.get(it.category) ?? PALETTE[0];
                return (
                  <article
                    key={it.code}
                    className={`flex items-start gap-2 rounded-md border-l-2 ${c.border} bg-background/60 p-2.5 transition hover:bg-muted/40`}
                  >
                    <span className={`flex-none rounded ${c.chip} px-1.5 py-0.5 font-mono text-[10px] tabular-nums`}>
                      {it.code}
                    </span>
                    <span className="flex-1 text-[13px] leading-snug">{it.title}</span>
                    {it.needsReview && (
                      <span
                        className="flex-none rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                        title={it.reviewNote ?? 'Needs PM review'}
                      >
                        ⚠
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Tree mode (hierarchical data) — branch-card layout
// =============================================================================

interface Branch {
  l1: WbsItem;
  descendants: WbsItem[];
  colour: CategoryColour;
}

function WbsTree({ items }: { items: WbsItem[] }) {
  const branches: Branch[] = useMemo(() => {
    let idx = 0;
    return items
      .filter((it) => it.level === 1)
      .map((l1) => ({
        l1,
        descendants: items.filter((other) => other.code.startsWith(l1.code + '.')),
        colour: PALETTE[idx++ % PALETTE.length],
      }));
  }, [items]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(code: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }
  function collapseAll() {
    setCollapsed(new Set(branches.map((b) => b.l1.code)));
  }
  function expandAll() {
    setCollapsed(new Set());
  }

  const totalCount = items.length;
  const reviewCount = items.filter((it) => it.needsReview).length;
  const maxLevel = items.reduce((m, it) => Math.max(m, it.level), 0);

  return (
    <div className="rounded-lg border bg-card p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">WBS structure</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalCount} work package{totalCount === 1 ? '' : 's'} across {branches.length} branch{branches.length === 1 ? '' : 'es'} ({maxLevel} level{maxLevel === 1 ? '' : 's'}).
            {reviewCount > 0 && ` ${reviewCount} flagged for PM review.`}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {branches.map((b) => {
          const isCollapsed = collapsed.has(b.l1.code);
          return (
            <article
              key={b.l1.code}
              className={`overflow-hidden rounded-md border ${b.colour.border} ${b.colour.bg}`}
            >
              <button
                type="button"
                onClick={() => toggle(b.l1.code)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-white/30"
              >
                <span className={`inline-flex h-4 w-4 flex-none items-center justify-center text-[10px] ${b.colour.text}`}>
                  {isCollapsed ? '▶' : '▼'}
                </span>
                <span className={`flex-none rounded ${b.colour.chip} px-1.5 py-0.5 font-mono text-[10px] tabular-nums`}>
                  {b.l1.code}
                </span>
                <span className={`flex-1 text-sm font-semibold ${b.colour.text}`}>{b.l1.title}</span>
                <span className="flex-none rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
                  {b.descendants.length} pkg{b.descendants.length === 1 ? '' : 's'}
                </span>
              </button>
              {!isCollapsed && b.descendants.length > 0 && (
                <ul className="space-y-px border-t border-white/60 bg-white/40 p-2">
                  {b.descendants.map((d) => {
                    const indent = (d.level - 2) * 14;
                    return (
                      <li
                        key={d.code}
                        className="flex items-start gap-2 rounded px-2 py-1 text-[13px] transition hover:bg-white/70"
                        style={{ paddingLeft: `${indent + 8}px` }}
                      >
                        <span className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground/80">
                          {d.code}
                        </span>
                        <span className="flex-1 leading-snug">{d.title}</span>
                        {d.needsReview && (
                          <span
                            className="flex-none rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                            title={d.reviewNote ?? 'Needs PM review'}
                          >
                            ⚠
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
