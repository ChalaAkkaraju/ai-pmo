-- Admin-configurable Learn-menu visibility.
--
-- One row per Learn item. visibility is one of:
--   'everyone' — any signed-in colleague
--   'admin'    — admins only
--   'roles'    — only the role_types listed in allowed_roles
-- Admins always see every item regardless of this setting. Rules are read by
-- the header (to filter the menu) and by each Learn page (to guard access), and
-- edited by admins in /admin/learn.

create table if not exists learn_content (
  key text primary key,
  label text not null,
  path text not null,
  sort_order int not null default 0,
  visibility text not null default 'everyone' check (visibility in ('everyone', 'admin', 'roles')),
  allowed_roles text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Seed with sensible defaults: education for everyone; internal/technical
-- material admin-only. All of this is editable in /admin/learn afterwards.
insert into learn_content (key, label, path, sort_order, visibility) values
  ('learn',        'Learn home',      'learn',          10, 'everyone'),
  ('about',        'How it works',    'about',          20, 'everyone'),
  ('architecture', 'Architecture',    'architecture',   30, 'admin'),
  ('framework',    'PMBOK coverage',  'framework',      40, 'everyone'),
  ('agents',       'The 15 agents',   'agents',         50, 'everyone'),
  ('concepts',     'AI concepts',     'concepts',       60, 'admin'),
  ('training',     'Training',        'learn/training', 70, 'everyone'),
  ('technical',    'Technical notes', 'technical',      80, 'admin')
on conflict (key) do nothing;

alter table learn_content enable row level security;

-- Any authenticated colleague may read the rules; writes go only through the
-- admin server actions (service-role client, which bypasses RLS).
drop policy if exists learn_content_read on learn_content;
create policy learn_content_read on learn_content for select to authenticated using (true);
