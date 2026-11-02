-- The workouts table as it exists in the live project (read from the database
-- on 2026-11-02). It was created by hand in the dashboard; this file lets a new
-- Supabase project be set up from the repo. Don't run it on the live project:
-- the table and its policy already exist there.

create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  date date,
  type text,       -- "push", "pull", "legs", "fullbody", "core" or "other"
  exercises jsonb, -- [{ id, name, sets, reps, weight }], weight in kg
  note text,
  created_at timestamptz
);

alter table public.workouts enable row level security;

-- One policy for every operation: users see and change only their own rows.
create policy "Manage own workouts"
  on public.workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
