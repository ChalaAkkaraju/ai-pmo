/**
 * Brand chart palette — the earned-value / margin metric triad, defined once.
 *
 * These are deliberately raw hex (not Tailwind classes) because they drive SVG
 * strokes/fills that need exact colour. Import these instead of hardcoding the
 * hex in each chart so the brand colours stay identical everywhere.
 */
export const CHART = {
  planned: '#378ADD', // PV / planned / baseline anchor — brand blue
  earned: '#639922', // EV / earned / gain — brand green
  actual: '#BA7517', // AC / actual cost — brand tan
  erosion: '#E24B4A', // overrun / erosion / negative — brand red
  today: '#DC2626', // "today" marker line
} as const;
