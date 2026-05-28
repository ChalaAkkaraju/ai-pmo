-- =============================================================================
-- PMO LLM Demo — cache long-form report markdown on the agent_outputs row
-- =============================================================================
-- Why: when a user opens a report at /access/<token>/report/<outputId>, the
-- page regenerates the long-form version of the agent output (the DB holds
-- only the ~250-word quick brief; the polished report needs the ~1,500-word
-- long-form). That regen takes ~30 seconds and runs on every open. With this
-- column, the long-form is written back to the row on the FIRST open and
-- served instantly on every subsequent open.
--
-- The column is nullable: NULL means "no cached long-form yet — regenerate
-- and write it back." Once populated, the report page skips the regen call
-- entirely.
-- =============================================================================

alter table agent_outputs
  add column if not exists full_output_md text;

comment on column agent_outputs.full_output_md is
  'Cached long-form (~1500 word) regeneration of output_md (~250 word quick brief). NULL until the report page is opened for the first time; populated by /api/report/save-full thereafter.';
