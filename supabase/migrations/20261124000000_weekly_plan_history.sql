-- Weekly plan history: the plan that applied in each week, so adherence for past
-- weeks is measured against the plan of that week, not today's plan.
-- One row per user and week; the app upserts the row for the current week
-- (week_start = that week's Monday in the user's local time) every time it saves
-- the plan, so the last plan saved in a week is the one that week is measured by.
-- Run it in the Supabase SQL editor (or with `supabase db push`). Until it is run,
-- the app keeps working and measures every week by the current plan.

create table if not exists public.weekly_plan_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1), -- a Monday
  -- Same shape as weekly_plans.days: seven workout types, Monday first.
  days jsonb not null
    check (jsonb_typeof(days) = 'array' and jsonb_array_length(days) = 7),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_plan_history enable row level security;

-- Same policies as weekly_plans: an upsert needs select, insert and update.
-- No delete policy; deleting the user removes the rows through the foreign key.
create policy "Users read their own plan history"
  on public.weekly_plan_history for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own plan history"
  on public.weekly_plan_history for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own plan history"
  on public.weekly_plan_history for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Plans saved before this migration become the first history entry, dated to the
-- week they were last saved in (date_trunc('week') is the ISO week, Monday, in UTC).
-- The app measures older weeks by the oldest entry, which is the best guess there is.
insert into public.weekly_plan_history (user_id, week_start, days, updated_at)
select user_id, date_trunc('week', updated_at)::date, days, updated_at
from public.weekly_plans
on conflict (user_id, week_start) do nothing;
