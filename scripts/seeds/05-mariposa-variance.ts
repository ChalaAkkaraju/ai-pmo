/**
 * Mariposa variance reports — 4 entries.
 *
 * Reads the canonical variance markdown from scripts/seed-content/mariposa/runs/:
 *   - run13_variance_mariposa.md           (Week 0 framework)
 *   - run21_variance_mariposa_week28.md    (Week 28 mid-civil)
 *   - run24_variance_mariposa_week52.md    (Week 52 mid-erection)
 *   - run28_variance_mariposa_week78.md    (Week 78 final SC)
 *
 * Numeric metrics extracted from the run outputs match the Build Rulebook
 * change log narratives.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

const SEED_CONTENT_DIR = join(__dirname, '..', 'seed-content', 'mariposa', 'runs');

interface MariposaVariance {
  report_week: number;
  cpi: number;
  spi: number;
  cost_variance_m: number;
  schedule_variance_days: number;
  contingency_consumed_m: number;
  projected_margin_pct: number;
  buffer_intact_days: number | null;
  run_file: string;
}

const variances: MariposaVariance[] = [
  {
    report_week: 0,
    cpi: 1.0, // framework state — no variance yet
    spi: 1.0,
    cost_variance_m: 0,
    schedule_variance_days: 0,
    contingency_consumed_m: 0,
    projected_margin_pct: 9.5, // bid margin
    buffer_intact_days: 30,
    run_file: 'run13_variance_mariposa.md',
  },
  {
    report_week: 28,
    cpi: 0.99,
    spi: 0.98,
    cost_variance_m: -0.18, // sub-grade remediation
    schedule_variance_days: 5, // foundation slip within Chain D float
    contingency_consumed_m: 0.18,
    projected_margin_pct: 9.4,
    buffer_intact_days: 30,
    run_file: 'run21_variance_mariposa_week28.md',
  },
  {
    report_week: 52,
    cpi: 1.0, // recovered from 0.99
    spi: 0.99,
    cost_variance_m: 0.27, // net favourable forward-projected
    schedule_variance_days: 5, // Chain E pace shortfall within 5-day float
    contingency_consumed_m: 0.42, // sub-grade + weather + minor items
    projected_margin_pct: 9.3, // weather event compression
    buffer_intact_days: 30,
    run_file: 'run24_variance_mariposa_week52.md',
  },
  {
    report_week: 78,
    cpi: 1.0, // final SC
    spi: 1.0,
    cost_variance_m: 0.27, // net favourable
    schedule_variance_days: 0, // on contractual date
    contingency_consumed_m: 0.52, // final
    projected_margin_pct: 9.5, // recovered to bid
    buffer_intact_days: 30, // intact at SC handover
    run_file: 'run28_variance_mariposa_week78.md',
  },
];

export async function seedMariposaVariance(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ inserted: number }> {
  const rows = variances.map((v) => {
    const filePath = join(SEED_CONTENT_DIR, v.run_file);
    const full_report_md = readFileSync(filePath, 'utf-8');
    return {
      project_id: projectId,
      report_week: v.report_week,
      cpi: v.cpi,
      spi: v.spi,
      cost_variance_m: v.cost_variance_m,
      schedule_variance_days: v.schedule_variance_days,
      contingency_consumed_m: v.contingency_consumed_m,
      projected_margin_pct: v.projected_margin_pct,
      buffer_intact_days: v.buffer_intact_days,
      full_report_md,
    };
  });

  const { error, count } = await supabase
    .from('variance_reports')
    .upsert(rows, { onConflict: 'project_id,report_week', count: 'exact' });

  if (error) {
    throw new Error(`Failed to upsert Mariposa variance reports: ${error.message}`);
  }

  return { inserted: count ?? rows.length };
}
