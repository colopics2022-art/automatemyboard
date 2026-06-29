-- ============================================================
-- AutomateMyBoard — Migration: Multi-Role & Multi-Unit
-- Date: 2026-06-28
-- Run this in: Supabase → SQL Editor → New Query → Run
-- ============================================================


-- ── STEP 1: CREATE profile_roles JUNCTION TABLE ──────────────

create table if not exists profile_roles (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  role         text not null check (role in ('admin', 'board', 'owner', 'tenant', 'vendor')),
  created_at   timestamptz default now(),
  unique (profile_id, role)
);

comment on table profile_roles is
  'Junction table: one user can hold multiple roles.
   Business rules:
     admin  → implicitly has board access
     board  → must also have owner role
     owner  → may also have tenant role
     vendor → standalone role';


-- ── STEP 2: CREATE profile_units JUNCTION TABLE ──────────────

create table if not exists profile_units (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  unit_id      uuid not null references units(id) on delete cascade,
  is_primary   boolean default true,
  created_at   timestamptz default now(),
  unique (profile_id, unit_id)
);

comment on table profile_units is
  'Junction table: one owner can be linked to multiple units.
   is_primary = true marks their default/main unit for UI display.';


-- ── STEP 3: MIGRATE EXISTING DATA ────────────────────────────

-- Migrate existing single role → profile_roles
insert into profile_roles (profile_id, role)
select id, role
from profiles
where role is not null
on conflict (profile_id, role) do nothing;

-- board members also get owner role
insert into profile_roles (profile_id, role)
select id, 'owner'
from profiles
where role = 'board'
on conflict (profile_id, role) do nothing;

-- admins also get board role
insert into profile_roles (profile_id, role)
select id, 'board'
from profiles
where role = 'admin'
on conflict (profile_id, role) do nothing;

-- Migrate existing single unit_id → profile_units
insert into profile_units (profile_id, unit_id, is_primary)
select id, unit_id, true
from profiles
where unit_id is not null
on conflict (profile_id, unit_id) do nothing;


-- ── STEP 4: HELPER FUNCTIONS ─────────────────────────────────
-- Must exist BEFORE we recreate RLS policies below

create or replace function has_role(p_user_id uuid, p_role text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profile_roles
    where profile_id = p_user_id
    and role = p_role
  );
$$;

create or replace function has_any_role(p_user_id uuid, p_roles text[])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profile_roles
    where profile_id = p_user_id
    and role = any(p_roles)
  );
$$;


-- ── STEP 5: DROP DEPENDENT RLS POLICIES ──────────────────────
-- These reference profiles.role directly — must drop before column drop

drop policy if exists "units_board_select"      on units;
drop policy if exists "documents_board_only"    on documents;
drop policy if exists "documents_board_insert"  on documents;
drop policy if exists "requests_board_select"   on record_requests;
drop policy if exists "requests_board_update"   on record_requests;

-- Also drop any other policies that may reference profiles.role
drop policy if exists "profiles_board_select"   on profiles;


-- ── STEP 6: DROP OLD COLUMNS FROM profiles ───────────────────

alter table profiles drop column if exists role;
alter table profiles drop column if exists unit_id;


-- ── STEP 7: RECREATE RLS POLICIES using has_role() ───────────

-- profiles: board/admin can read all profiles in their community
create policy "profiles_board_select" on profiles
  for select using (
    has_any_role(auth.uid(), array['admin', 'board'])
  );

-- units: board/admin see all units
create policy "units_board_select" on units
  for select using (
    has_any_role(auth.uid(), array['admin', 'board'])
  );

-- documents: board_only docs visible to board/admin only
create policy "documents_board_only" on documents
  for select using (
    visibility != 'board_only'
    or has_any_role(auth.uid(), array['admin', 'board'])
  );

-- documents: only board/admin can insert
create policy "documents_board_insert" on documents
  for insert with check (
    has_any_role(auth.uid(), array['admin', 'board'])
  );

-- record_requests: board/admin can read all requests
create policy "requests_board_select" on record_requests
  for select using (
    has_any_role(auth.uid(), array['admin', 'board'])
  );

-- record_requests: board/admin can update requests
create policy "requests_board_update" on record_requests
  for update using (
    has_any_role(auth.uid(), array['admin', 'board'])
  );


-- ── STEP 8: RLS POLICIES for new tables ──────────────────────

alter table profile_roles enable row level security;
alter table profile_units enable row level security;

-- Users can read their own roles
create policy "profile_roles_select_own" on profile_roles
  for select using (profile_id = auth.uid());

-- Board/admin can read all roles
create policy "profile_roles_board_select" on profile_roles
  for select using (
    has_any_role(auth.uid(), array['admin', 'board'])
  );

-- Users can read their own unit links
create policy "profile_units_select_own" on profile_units
  for select using (profile_id = auth.uid());

-- Board/admin can read all unit links
create policy "profile_units_board_select" on profile_units
  for select using (
    has_any_role(auth.uid(), array['admin', 'board'])
  );


-- ── VERIFICATION (uncomment and run separately after migration) ──

-- select p.full_name, p.email, pr.role
-- from profiles p
-- join profile_roles pr on pr.profile_id = p.id
-- order by p.full_name, pr.role;

-- select p.full_name, u.unit_number, pu.is_primary
-- from profiles p
-- join profile_units pu on pu.profile_id = p.id
-- join units u on u.id = pu.unit_id
-- order by p.full_name, u.unit_number;

-- ── DONE ─────────────────────────────────────────────────────
