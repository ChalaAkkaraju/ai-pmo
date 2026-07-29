'use client';

/**
 * New-projects indicator for the action ribbon.
 *
 * A compact "🆕 New {n}" pill sits at the left of the action ribbon; clicking it
 * opens this popover listing projects created through the intake form in the
 * last 14 days (newest first), each timestamped and linking to the project.
 * The pill + popover render only when there are recent additions. Open/close
 * and outside-click are managed by the parent (action-ribbon).
 */

import Link from 'next/link';
import { segmentStyle } from '@/lib/segment-style';
import { roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

export interface RecentlyAddedProject {
  code: string;
  name: string;
  segment: string;
  status: string;
  created_at: string;
  created_by_role_type?: string | null;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

export function NewProjectsPopover({
  projects,
  onClose,
}: {
  projects: RecentlyAddedProject[];
  onClose: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-lg border bg-background p-2 shadow-xl">
      <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Recently added · last 14 days
      </p>
      <div className="max-h-80 overflow-y-auto">
        {projects.map((p) => {
          const ss = segmentStyle(p.segment);
          return (
            <Link
              key={p.code}
              href={`/projects/${p.code}`}
              onClick={onClose}
              className="relative block overflow-hidden rounded-md px-3 py-2 transition hover:bg-muted"
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${ss.accentBar}`} />
              <div className="flex items-center justify-between gap-2 pl-1.5">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
              </div>
              <p className="pl-1.5 text-[11px] text-muted-foreground">
                <span className="font-mono">{p.code}</span> · {ss.label}
                {p.created_by_role_type ? ` · by ${roleLabel(p.created_by_role_type as RoleType)}` : ''}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
