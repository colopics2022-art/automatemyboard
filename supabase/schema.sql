-- ============================================================
-- AutomateMyBoard — Phase 1 Schema
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── COMMUNITIES ──────────────────────────────────────────────
create table communities (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  city        text,
  state       text default 'FL',
  zip         text,
  unit_count  integer,
  drive_folder_id text,           -- Google Drive root folder ID
  created_at  timestamptz default now()
);

-- ── PROFILES (extends Supabase auth.users) ───────────────────
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  community_id    uuid references communities(id),
  full_name       text,
  email           text,
  phone           text,
  role            text check (role in ('admin','board','owner','tenant','vendor')),
  unit_id         uuid,           -- filled in after units table created
  avatar_url      text,
  created_at      timestamptz default now()
);

-- ── UNITS ────────────────────────────────────────────────────
create table units (
  id              uuid primary key default uuid_generate_v4(),
  community_id    uuid references communities(id) on delete cascade,
  unit_number     text not null,  -- e.g. A101
  building        text,           -- A, B, C, D, E
  floor           integer,        -- 1 or 2
  owner_id        uuid references profiles(id),
  tenant_id       uuid references profiles(id),
  status          text check (status in ('owner_occupied','tenant_occupied','vacant')) default 'vacant',
  drive_folder_id text,           -- unit-specific Drive folder
  created_at      timestamptz default now(),
  unique (community_id, unit_number)
);

-- add foreign key now that units exists
alter table profiles add constraint profiles_unit_fk
  foreign key (unit_id) references units(id);

-- ── DOCUMENTS ────────────────────────────────────────────────
create table documents (
  id              uuid primary key default uuid_generate_v4(),
  community_id    uuid references communities(id) on delete cascade,
  unit_id         uuid references units(id),   -- null = community-wide doc
  title           text not null,
  category        text check (category in (
                    'governing','board_only','financial',
                    'meeting','maintenance','communication','unit')),
  drive_file_id   text,           -- Google Drive file ID
  drive_file_url  text,           -- direct view URL
  visibility      text check (visibility in ('all','board','owner','unit_only'))
                    default 'board',
  posted_at       timestamptz default now(),
  retention_years integer default 7,  -- 7 or 15 (SIRS) or null (permanent)
  hb1021_required boolean default false,
  created_by      uuid references profiles(id),
  created_at      timestamptz default now()
);

-- ── RECORD REQUESTS (HB 1021 — 10 working day SLA) ──────────
create table record_requests (
  id              uuid primary key default uuid_generate_v4(),
  community_id    uuid references communities(id) on delete cascade,
  requester_id    uuid references profiles(id),
  requester_name  text,
  requester_email text,
  items_requested text not null,
  requested_at    timestamptz default now(),
  due_at          timestamptz,    -- set by trigger: +10 working days
  status          text check (status in ('open','in_progress','fulfilled','overdue'))
                    default 'open',
  fulfilled_at    timestamptz,
  notes           text,
  created_at      timestamptz default now()
);

-- ── COMPLIANCE LOG ────────────────────────────────────────────
create table compliance_events (
  id              uuid primary key default uuid_generate_v4(),
  community_id    uuid references communities(id) on delete cascade,
  event_type      text,           -- 'document_posted','request_fulfilled', etc
  description     text,
  reference_id    uuid,           -- doc or request id
  created_at      timestamptz default now()
);

-- ── SEED: MARTEL ARMS HOA ─────────────────────────────────────
insert into communities (id, name, address, city, state, zip, unit_count, drive_folder_id)
values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Martel Arms HOA',
  '123 Martel Avenue',
  'Delray Beach',
  'FL',
  '33444',
  30,
  '1B_celNz21S7V9kBtDOf1GEbi-85sB9XS'
);

-- Seed all 30 units: buildings A-E, floors 1-2, units 1-3
do $$
declare
  buildings text[] := array['A','B','C','D','E'];
  b text;
  f integer;
  u integer;
  unit_num text;
begin
  foreach b in array buildings loop
    for f in 1..2 loop
      for u in 1..3 loop
        unit_num := b || f || '0' || u;
        insert into units (community_id, unit_number, building, floor, status)
        values (
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          unit_num,
          b,
          f,
          'vacant'
        )
        on conflict (community_id, unit_number) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table communities      enable row level security;
alter table profiles         enable row level security;
alter table units            enable row level security;
alter table documents        enable row level security;
alter table record_requests  enable row level security;
alter table compliance_events enable row level security;

-- Profiles: users can read/update their own
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Board/admin can read all profiles in their community
create policy "profiles_board_select" on profiles
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('admin','board')
      and p.community_id = profiles.community_id
    )
  );

-- Communities: members can read their own community
create policy "communities_select" on communities
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.community_id = communities.id
    )
  );

-- Units: board/admin see all; owners/tenants see their own
create policy "units_board_select" on units
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin','board')
      and profiles.community_id = units.community_id
    )
  );

create policy "units_owner_select" on units
  for select using (
    auth.uid() = owner_id or auth.uid() = tenant_id
  );

-- Documents: board_only visible only to board/admin
create policy "documents_board_only" on documents
  for select using (
    visibility = 'board_only' and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin','board')
    )
  );

-- Documents: all-visibility docs visible to all community members
create policy "documents_all_visibility" on documents
  for select using (
    visibility = 'all' and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.community_id = documents.community_id
    )
  );

-- Documents: unit_only visible to that unit's owner/tenant
create policy "documents_unit_only" on documents
  for select using (
    visibility = 'unit_only' and exists (
      select 1 from units
      where units.id = documents.unit_id
      and (units.owner_id = auth.uid() or units.tenant_id = auth.uid())
    )
  );

-- Documents: board can insert
create policy "documents_board_insert" on documents
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin','board')
    )
  );

-- Record requests: owners can create and see their own
create policy "requests_owner_insert" on record_requests
  for insert with check (auth.uid() = requester_id);

create policy "requests_owner_select" on record_requests
  for select using (auth.uid() = requester_id);

-- Board can see all requests in their community
create policy "requests_board_select" on record_requests
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin','board')
      and profiles.community_id = record_requests.community_id
    )
  );

-- Board can update request status
create policy "requests_board_update" on record_requests
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin','board')
    )
  );

-- ── HELPER FUNCTION: auto-create profile on signup ───────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
