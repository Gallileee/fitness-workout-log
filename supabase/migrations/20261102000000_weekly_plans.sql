-- Weekly training plan: one row per user, saved by the app with an upsert on user_id.
-- Run it in the Supabase SQL editor (or with `supabase db push` if you use the Supabase CLI).

create table if not exists public.weekly_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Seven workout types, Monday first: "off", "push", "pull", "legs", "fullbody", "core" or "other".
  days jsonb not null
    check (jsonb_typeof(days) = 'array' and jsonb_array_length(days) = 7),
  updated_at timestamptz not null default now()
);

alter table public.weekly_plans enable row level security;

-- An upsert (INSERT ... ON CONFLICT DO UPDATE) needs the insert and update
-- policies, and the select policy to read the existing row. There is no
-- delete policy: the app never deletes plans, and deleting the user removes
-- the row through the foreign key. `(select auth.uid())` is evaluated once per
-- query instead of once per row.
create policy "Users read their own plan"
  on public.weekly_plans for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own plan"
  on public.weekly_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own plan"
  on public.weekly_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
