/**
 * Paginated full-table read. PostgREST caps a single response at the API
 * `max_rows` setting (1000 by default on both the local stack and Supabase
 * cloud), so a `.limit(100000)` is silently truncated — which quietly drops
 * projects from portfolio-level rollups (earned value, resources, etc.). This
 * pages through in `pageSize` chunks with `.range()` so we always get every row,
 * independent of the server cap. Use for unfiltered portfolio-wide reads.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function selectAll<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  columns = '*',
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(`selectAll(${table}): ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
