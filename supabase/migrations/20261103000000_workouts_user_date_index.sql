-- Index for the app's main query, `where user_id = ? order by date desc`, and
-- for the RLS check on user_id. Without it every query scans the whole table,
-- which is fine for a few hundred rows but grows with every user and workout.
-- Applied to the live project on 2026-11-02.
create index if not exists workouts_user_id_date_idx
  on public.workouts (user_id, date desc);
