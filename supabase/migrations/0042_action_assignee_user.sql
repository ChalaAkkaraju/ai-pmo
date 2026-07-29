-- User-level task assignment.
--
-- Until now an action_item could only target a whole role_type (any colleague
-- with that role saw it in their queue). Roles can have many users, so we add
-- an optional pointer to a specific person (a roles row). When
-- assigned_to_user_id is set the task belongs to that individual; when NULL it
-- stays role-wide (assigned_to_role_type as before). Existing rows are
-- unaffected — they remain role-wide.

alter table action_items
  add column if not exists assigned_to_user_id uuid references roles(id) on delete set null;

create index if not exists action_items_assigned_to_user_id_idx
  on action_items (assigned_to_user_id);
