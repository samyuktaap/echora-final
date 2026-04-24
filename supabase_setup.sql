-- ═══════════════════════════════════════════════════════════════════════
-- ECHORA — Supabase Database Setup
-- Run this entire file in your Supabase SQL Editor (once)
-- Dashboard → SQL Editor → New Query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. PROFILES TABLE ───────────────────────────────────────────────────
-- One row per user. Automatically linked to auth.users via `id`.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  name          text not null default '',
  role          text not null default 'volunteer' check (role in ('volunteer', 'ngo')),
  bio           text default '',
  location      text default '',
  state         text default '',
  lat           double precision default 20.5937,
  lng           double precision default 78.9629,
  experience    text default 'Beginner',
  skills        text[] default '{}',
  languages     text[] default '{}',
  points        integer default 0,
  badges        text[] default '{"Newcomer"}',
  tasks_completed integer default 0,
  avatar        text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── 2. NOTES TABLE ──────────────────────────────────────────────────────
-- Personal volunteer activity notes. Only the owner can see theirs.

create table if not exists public.notes (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  task       text not null,
  note       text not null,
  rating     integer default 5 check (rating between 1 and 5),
  date       text,
  created_at timestamptz default now()
);

-- ── 3. ROW LEVEL SECURITY ───────────────────────────────────────────────
-- This is the key part: each user can ONLY see and modify their OWN rows.
-- Supabase enforces this at the database level — impossible to bypass.

-- Profiles RLS
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Notes RLS
alter table public.notes enable row level security;

drop policy if exists "Users can manage own notes" on public.notes;
drop policy if exists "Users can view own notes" on public.notes;
drop policy if exists "Users can insert own notes" on public.notes;
drop policy if exists "Users can delete own notes" on public.notes;

create policy "Users can view own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- ── 4. AUTO-UPDATE updated_at TRIGGER ──────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ── 5. AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────────────
-- Fallback: if the frontend profile insert fails for any reason,
-- this trigger creates a minimal profile row automatically.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'volunteer')
  )
  on conflict (id) do nothing;   -- don't overwrite if frontend already inserted
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 6. VOLUNTEER DETAILS TABLE ───────────────────────────────────────────
-- Extended onboarding data for volunteers (KYC, etc.)

create table if not exists public.volunteer_details (
  id              uuid primary key references public.profiles(id) on delete cascade,
  phone           text,
  address         text,
  dob             text,
  id_proof_type   text,
  id_proof_number text,
  created_at      timestamptz default now()
);

alter table public.volunteer_details enable row level security;

create policy "Users can manage own details"
  on public.volunteer_details for all
  using (auth.uid() = id);

-- ── 7. NGO APPLICATIONS TABLE ───────────────────────────────────────────
-- Applications submitted by volunteers for NGO tasks.

create table if not exists public.ngo_applications (
  id              bigserial primary key,
  volunteer_id    uuid not null references public.profiles(id) on delete cascade,
  ngo_id          uuid references public.profiles(id) on delete cascade,
  task_id         text not null,
  task_title      text,
  volunteer_name  text,
  volunteer_email text,
  phone           text,
  address         text,
  dob             text,
  id_proof_type   text,
  id_proof_number text,
  message         text,
  match_score     integer default 0,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at      timestamptz default now()
);

alter table public.ngo_applications enable row level security;

-- Volunteers can view and insert their own applications
create policy "Volunteers can manage own applications"
  on public.ngo_applications for all
  using (auth.uid() = volunteer_id);

-- NGOs can view applications for their tasks (if ngo_id is set)
create policy "NGOs can view applications"
  on public.ngo_applications for select
  using (auth.uid() = ngo_id);

-- ── 8. NGO TASKS TABLE ──────────────────────────────────────────────────
-- Tasks posted by NGOs for volunteers to apply to.

create table if not exists public.ngo_tasks (
  id              bigserial primary key,
  ngo_id          uuid not null references public.profiles(id) on delete cascade,
  ngo_name        text,
  title           text not null,
  description     text not null,
  cause           text,
  location        text not null,
  state           text,
  required_skills text[] default '{}',
  min_experience  text default 'Beginner',
  availability    text default 'Flexible',
  urgency         text default 'medium',
  spots           integer default 1,
  deadline        text,
  active          boolean default true,
  created_at      timestamptz default now()
);

alter table public.ngo_tasks enable row level security;

-- Everyone can view active tasks
create policy "Anyone can view active tasks"
  on public.ngo_tasks for select
  using (active = true);

-- NGOs can manage their own tasks
create policy "NGOs can manage own tasks"
  on public.ngo_tasks for all
  using (auth.uid() = ngo_id);

-- ── 9. DONE! ─────────────────────────────────────────────────────────────
-- Your database is ready.
-- ═══════════════════════════════════════════════════════════════════════
