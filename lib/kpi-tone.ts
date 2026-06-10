/**
 * Canonical KPI / stat-card styling. ONE source of truth so every KPI tile across
 * the app (dashboard, analytics, project workspace, panels) reads consistently:
 * a tinted card surface + matching value colour by tone.
 */
export type KpiTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

/** Tinted card surface (border + background) by tone. Neutral = solid white card. */
export function toneCard(tone: KpiTone = 'neutral'): string {
  switch (tone) {
    case 'ok':   return 'border-emerald-200 bg-emerald-50/50';
    case 'warn': return 'border-amber-300 bg-amber-50/60';
    case 'bad':  return 'border-red-300 bg-red-50/50';
    case 'info': return 'border-sky-200 bg-sky-50/50';
    default:     return 'bg-card';
  }
}

/** Matching value-text colour by tone. */
export function toneText(tone: KpiTone = 'neutral'): string {
  switch (tone) {
    case 'ok':   return 'text-emerald-700';
    case 'warn': return 'text-amber-700';
    case 'bad':  return 'text-red-600';
    case 'info': return 'text-sky-700';
    default:     return 'text-foreground';
  }
}
