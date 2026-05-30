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

  // Single indented-tree renderer for both flat and hierarchical WBS data.
  void maxLevel;
  return <WbsIndentedTree items={items} />;
}

// =============================================================================
// Indented tree renderer (used for both flat and hierarchical WBS data)
// =============================================================================

interface TreeNode extends WbsItem {
  children: TreeNode[];
}

/** Numeric-aware compare of WBS codes (1.2 < 1.10). */
function compareCodes(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10));
  const pb = b.split('.').map((n) => parseInt(n, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? -1;
    const y = pb[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

/** Build a parent→child tree from the flat WBS items using their dotted codes. */
function buildTree(items: WbsItem[]): TreeNode[] {
  const byCode = new Map<string, TreeNode>();
  for (const it of items) byCode.set(it.code, { ...it, children: [] });

  const roots: TreeNode[] = [];
  for (const node of byCode.values()) {
    const parts = node.code.split('.');
    let parent: TreeNode | undefined;
    // Walk up the code (drop last segment) until a known ancestor is found.
    for (let cut = parts.length - 1; cut >= 1 && !parent; cut--) {
      parent = byCode.get(parts.slice(0, cut).join('.'));
    }
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => compareCodes(a.code, b.code));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}

function WbsIndentedTree({ items }: { items: WbsItem[] }) {
  const tree = useMemo(() => buildTree(items), [items]);
  const reviewCount = items.filter((it) => it.needsReview).length;
  const maxLevel = items.reduce((m, it) => Math.max(m, it.level), 0);

  const parentCodes = useMemo(
    () => items.filter((it) => items.some((o) => o.code.startsWith(it.code + '.'))).map((it) => it.code),
    [items],
  );
  // Default: top-level branches collapsed (children hidden) so the user sees a
  // clean L1 overview and drills in as needed.
  const rootCodes = useMemo(() => tree.map((n) => n.code), [tree]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(rootCodes));

  function toggle(code: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">WBS structure</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {items.length} work package{items.length === 1 ? '' : 's'}
            {maxLevel > 1 ? ` across ${maxLevel} levels` : ''}.
            {reviewCount > 0 && ` ${reviewCount} flagged for PM review.`}
          </p>
        </div>
        {parentCodes.length > 0 && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(new Set())}
              className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(new Set(parentCodes))}
              className="rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Collapse all
            </button>
          </div>
        )}
      </header>

      <ul className="space-y-1.5 text-[13px]">
        {tree.map((n, i) => (
          <TreeRow key={n.code} node={n} depth={0} colour={PALETTE[i % PALETTE.length]} collapsed={collapsed} onToggle={toggle} />
        ))}
      </ul>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  colour,
  collapsed,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  colour: CategoryColour;
  collapsed: Set<string>;
  onToggle: (code: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.code);
  const isTop = depth === 0;
  // A "sub-branch" is a non-top node that itself has children (e.g. 4.1, 4.2).
  const isSubBranch = !isTop && hasChildren;

  // Top-level → coloured card header. Sub-branch → tinted band so 4.1/4.2 read
  // as section headers. Leaf rows → plain indented row.
  let rowClasses: string;
  if (isTop) {
    rowClasses = `group flex items-start gap-2 rounded-lg border ${colour.border} ${colour.bg} px-3 py-2 transition hover:brightness-[0.98]`;
  } else if (isSubBranch) {
    rowClasses = `group flex items-start gap-2 rounded-md ${colour.bg} px-2 py-1.5 transition hover:brightness-[0.98]`;
  } else {
    rowClasses = 'group flex items-start gap-2 rounded-md py-1 pr-2 transition hover:bg-muted/40';
  }
  const rowStyle: React.CSSProperties = isTop
    ? {}
    : {
        paddingLeft: `${(depth - 1) * 18 + 10}px`,
        marginLeft: `${(depth - 1) * 18 + 12}px`,
        borderLeft: `${isSubBranch ? 3 : 2}px solid var(--wbs-accent)`,
      };

  return (
    <li style={{ ['--wbs-accent' as string]: colourHex(colour) }}>
      <div className={rowClasses} style={rowStyle}>
        {/* expand/collapse caret (or spacer) */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.code)}
            className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded text-[10px] transition hover:bg-black/5 ${isTop || isSubBranch ? colour.text : 'text-muted-foreground hover:text-foreground'}`}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span className={`mt-0.5 inline-block h-4 w-4 flex-none text-center ${isTop ? colour.text : 'text-muted-foreground/40'}`}>·</span>
        )}

        {/* code chip */}
        <span className={`mt-0.5 flex-none rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${isTop || isSubBranch ? colour.chip : 'bg-muted text-foreground/80'}`}>
          {node.code}
        </span>

        {/* title */}
        <span className={`flex-1 leading-snug ${isTop ? `font-semibold ${colour.text}` : isSubBranch ? `font-semibold ${colour.text}` : ''}`}>
          {node.title}
        </span>

        {/* child count on parents */}
        {hasChildren && (
          <span className={`mt-0.5 flex-none rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${isTop ? 'bg-white/70 text-muted-foreground' : 'bg-muted text-muted-foreground'}`}>
            {countDescendants(node)} pkg{countDescendants(node) === 1 ? '' : 's'}
          </span>
        )}

        {/* review flag */}
        {node.needsReview && (
          <span
            className="mt-0.5 flex-none rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
            title={node.reviewNote ?? 'Needs PM review'}
          >
            ⚠
          </span>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <ul className={isTop ? 'mt-1 space-y-px' : 'space-y-px'}>
          {node.children.map((c) => (
            <TreeRow key={c.code} node={c} depth={depth + 1} colour={colour} collapsed={collapsed} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Map a CategoryColour to a concrete hex for the inline accent border. */
function colourHex(c: CategoryColour): string {
  // Derive from the dot bg class (e.g. "bg-emerald-500").
  const map: Record<string, string> = {
    'bg-emerald-500': '#10b981',
    'bg-sky-500': '#0ea5e9',
    'bg-amber-500': '#f59e0b',
    'bg-violet-500': '#8b5cf6',
    'bg-pink-500': '#ec4899',
    'bg-teal-500': '#14b8a6',
    'bg-indigo-500': '#6366f1',
    'bg-rose-500': '#f43f5e',
  };
  return map[c.dot] ?? '#94a3b8';
}
