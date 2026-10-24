-- ---------------------------------------------------------------------------
-- 0052: Demo role switcher
--
-- A role row flagged demo_switcher lets the person signed in to it act as any
-- other (enabled) role — chosen from a "Switch role" menu in the header, or
-- defaulted from the address they came in on (it-*, rnd-*, capital-*). It is
-- a demonstration convenience, not a permission model: everything done while
-- switched is recorded against the role being acted as, exactly as if that
-- person had signed in. Everyone else keeps their single role.
-- ---------------------------------------------------------------------------
alter table roles add column if not exists demo_switcher boolean not null default false;

-- The owner's own login (matched by name; adjust in the admin data if renamed).
update roles set demo_switcher = true
where name ilike '%akkaraju%' and coalesce(disabled, false) = false;
