-- Learn visibility becomes a pure per-role allow-list (admin always implicit).
-- Backfill allowed_roles from the old visibility enum, then drop the enum.

-- 'everyone' -> every non-admin role
update learn_content
set allowed_roles = array[
  'pm','procurement','risk','sponsor','commercial','project_controls',
  'program_manager','engineering_manager','construction_manager','hse_manager'
]
where visibility = 'everyone';

-- 'admin' -> empty list (only admins; enforced implicitly in code)
update learn_content
set allowed_roles = '{}'
where visibility = 'admin';

-- 'roles' rows keep their existing allowed_roles.

alter table learn_content drop column if exists visibility;
