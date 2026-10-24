/**
 * Centralised segment colour mapping. Used across the dashboard, project
 * header, recent-activity feed, and (eventually) portfolio summary charts.
 *
 * Renewables = green, water = blue, industrial = slate, power = orange.
 * Colours chosen for accessibility (sufficient contrast on light & dark
 * backgrounds) and for distinguishability for users with common colour-vision
 * deficiencies.
 */

import type { Segment } from './types';

export interface SegmentStyle {
  /** Tailwind classes for a small pill/badge — bg + text + border. */
  badge: string;
  /** Tailwind class for a small 8px coloured dot indicator. */
  dot: string;
  /** Tailwind class for a left-side accent bar (4px). */
  accentBar: string;
  /** Tailwind class for a soft tinted card background (hover-friendly). */
  tintedCardHover: string;
  /** Plain hex colour for use in chart libraries (recharts etc.). */
  hex: string;
  /** Friendly display label. */
  label: string;
}

export const SEGMENT_STYLES: Record<Segment, SegmentStyle> = {
  renewables: {
    badge:
      'bg-emerald-50 text-emerald-900 border border-emerald-200',
    dot: 'bg-emerald-500',
    accentBar: 'bg-emerald-500',
    tintedCardHover: 'hover:bg-emerald-50/50',
    hex: '#10b981',
    label: 'Renewables',
  },
  water: {
    badge: 'bg-sky-50 text-sky-900 border border-sky-200',
    dot: 'bg-sky-500',
    accentBar: 'bg-sky-500',
    tintedCardHover: 'hover:bg-sky-50/50',
    hex: '#0ea5e9',
    label: 'Water',
  },
  industrial: {
    badge: 'bg-slate-100 text-slate-900 border border-slate-300',
    dot: 'bg-slate-500',
    accentBar: 'bg-slate-500',
    tintedCardHover: 'hover:bg-slate-50/50',
    hex: '#64748b',
    label: 'Industrial',
  },
  power: {
    badge:
      'bg-orange-50 text-orange-900 border border-orange-200',
    dot: 'bg-orange-500',
    accentBar: 'bg-orange-500',
    tintedCardHover: 'hover:bg-orange-50/50',
    hex: '#f97316',
    label: 'Power',
  },
};

/** Safe lookup with fallback to a neutral grey style. */
export function segmentStyle(segment: string | null | undefined): SegmentStyle {
  return (
    SEGMENT_STYLES[(segment ?? '') as Segment] ?? {
      badge: 'bg-gray-100 text-gray-700 border border-gray-200',
      dot: 'bg-gray-400',
      accentBar: 'bg-gray-400',
      tintedCardHover: 'hover:bg-gray-50/50',
      hex: '#9ca3af',
      label: segment ?? '—',
    }
  );
}

/**
 * Canonical lifecycle (Active / SC / Closed) palette — one source for the
 * lifecycle bar fills, legend dots, and status badges. These are CATEGORICAL
 * states, not a health gradient: blue = active/in-progress, emerald = good/done
 * (substantial completion), gray = closed/inactive. Greens are emerald to match
 * the app-wide "good/done" convention (see lib/badge-styles).
 */
export const LIFECYCLE: Record<'Active' | 'SC' | 'Closed', { bar: string; dot: string; badge: string }> = {
  Active: { bar: 'bg-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-900 border border-blue-200' },
  SC: { bar: 'bg-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-900 border border-emerald-200' },
  Closed: { bar: 'bg-gray-400', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 border border-gray-200' },
};

/** Friendly status label — spells out the SC abbreviation. */
export function statusLabel(status: string): string {
  return status === 'SC' ? 'Subst. complete' : status;
}

/** Status (Active/SC/Closed) badge styling — sourced from LIFECYCLE. */
export function statusBadge(status: string): string {
  return (LIFECYCLE as Record<string, { badge: string }>)[status]?.badge ?? LIFECYCLE.Active.badge;
}
