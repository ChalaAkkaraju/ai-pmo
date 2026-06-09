-- Prettier demo access tokens: strip the placeholder "-token-replace-me" suffix
-- so dashboard links read as /access/demo-pm, /access/demo-risk, etc.
-- Idempotent and safe to run on existing or freshly-seeded databases.
update roles
set token = replace(token, '-token-replace-me', '')
where token like '%-token-replace-me';
