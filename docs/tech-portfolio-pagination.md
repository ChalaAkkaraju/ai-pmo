# Portfolio Reads & Pagination

## Technical Edition · Chapter B18 — `lib/select-all.ts`

A small but load-bearing utility. PostgREST (Supabase's REST layer) caps a single
response at `max_rows` (1000) on both local and cloud. A naive `.select()` over a
table that has grown past 1000 rows silently returns only the first page — which once
dropped 67 of 99 projects out of a portfolio earned-value roll-up without any error.

`selectAll(supabase, table, columns, pageSize = 1000)` pages through with `.range()`
until a short page is returned, guaranteeing the full table:

```
for (let from = 0; ; from += pageSize) {
  const { data } = await supabase.from(table).select(columns).range(from, from + pageSize - 1);
  out.push(...data);
  if (data.length < pageSize) break;
}
```

**Rule:** any portfolio-wide rollup uses `selectAll`, never a single `.limit()` or a
bare `.select()`. It is applied across the dashboard reads, the EV/resources/changes
analytics pages, and the cash-flow page. The lesson generalises — silent truncation
is worse than an error, because the numbers still look plausible.
