# Progress log

## 2026-11-02 (3rd run): Component and whole-app tests, two bugs fixed

Done:
- Moved the frontend tests from `node:test` to **Vitest** (jsdom) and added **React Testing Library** + `user-event`. Vitest reuses the Vite config, so JSX and imports work the same as in the app. The 68 existing lib tests only changed their import line. The root server tests stay on `node:test`.
- Wrote tests that failed first and then fixed what they found:
  - **Bug: a failed workout save lost the data.** The dialog closed even when Supabase returned an error (shown only in an `alert()`). Now `handleSave` returns whether it succeeded; on failure the dialog stays open, keeps everything typed in and shows the error inside the dialog.
  - **Validation in the workout form**: the form accepted 0 sets, empty or fractional reps and negative weights (the `min`/`step` attributes aren't enforced, because "Přidat cvik" isn't a submit button). Now sets and reps must be whole numbers from 1 to 100, and weight a number from 0 to 1000 in the chosen unit. Errors appear inline (`role="alert"`) instead of `alert()`.
- New tests: `WorkoutForm` (11), `WeeklyPlan` + `PlanAdherence` (7), and `App` (4) on the demo client, including server failures, simulated by swapping `supabase.from` for a failing query.
- 90 tests in total.

Verified (Node 22.23): `npm test` 90/90, `npm run lint` clean, `vite build` passes. The new tests failed before the fixes (8 form tests and the failed-save app test). In the browser (`npm run demo`): the inline error shows above the dialog buttons; no console errors.

Noticed, not changed: `npm audit` reports 24 advisories in existing dependencies (vite, ws, eslint tooling, express deps…), 1 of them critical. They were there before this change; the new test packages don't add any.

## 2026-11-02 (2nd run): Plan adherence, workouts schema in the repo

Done:
- Ran the `weekly_plans` migration on the live Supabase project (owner approved) and merged PR #5. Checked: the table exists, RLS is on, 3 policies (select / insert / update) for `authenticated`.
- New `src/lib/adherence.js`: `currentWeekStatus()` (per day: done / other / missed / today / upcoming / rest / extra), `weeklyAdherence()` (last 8 weeks, sessions matched by type, so moved days still count), `completedWeekStreak()`. Weeks start on Monday and are computed through the calendar, not by adding milliseconds, so daylight saving changes don't shift them.
- New `PlanAdherence` card above the weekly plan (desktop: plan tab; mobile: Plan page): this week as 7 cells, 8 bars, streak. Each day and bar has a text description for screen readers and a tooltip.
- `supabase/migrations/20261101000000_workouts.sql`: the live `workouts` schema, read from the database with a read-only query (`id` is a uuid, not a bigint as the README used to say). Plus `20261103000000_workouts_user_date_index.sql`, an index for the main query, applied to the live project with the owner's go-ahead (checked: index valid).
- 14 new tests (68 in total).

Verified (Node 22.23): `npm test` 68/68, `npm run lint` clean, `vite build` passes. In the browser on `npm run demo`: the card shows 0/5 this week and 3/5 bars (the demo logs 3 sessions a week); switching Friday and Saturday to rest updated it to 0/3 with 7 full bars and a 7-week streak. Mobile 375×812: no horizontal overflow; no console errors.

Not verified: the card with real account data.

Found in the live schema (not changed):
- `workouts.user_id` has no foreign key to `auth.users`, so deleting a user leaves their workouts behind.
- `created_at` has no default, so it stays empty.

## 2026-11-02: Weekly plan saved in Supabase

Done:
- New table `weekly_plans` (`supabase/migrations/20261102000000_weekly_plans.sql`): one row per user, `days` stores only the 7 workout types (day names are UI labels), a check constraint on the array length, and RLS policies for select / insert / update with `(select auth.uid()) = user_id`. No delete policy; deleting the user cascades.
- `src/lib/weeklyPlan.js`: `normalizeWeeklyPlan()` turns a stored row (or a UI plan) into exactly 7 valid days and falls back to the default day by day, so a malformed row can't break the UI. `planToDays()` is the reverse.
- `src/lib/weeklyPlanStore.js`: `loadWeeklyPlan()` (`maybeSingle`, default plan when there is no row), `saveWeeklyPlan()` (upsert on `user_id`) and `createLatestSaver()`, which runs one save at a time and sends only the newest plan, so quick edits can't be saved out of order.
- App: the plan loads after login and resets on logout; every change is saved; the plan selects are disabled while loading; an inline status line shows saving / saved / errors instead of an `alert`.
- Demo client: per-table storage, `upsert` with `onConflict`, `maybeSingle`, and `.single()` now errors on 0 or 2+ rows like PostgREST.
- 16 new tests (54 in total): normalization, the store against a fake client, the save queue's ordering and status reporting, and the demo client round trip.

Verified (Node 22.23): `npm test` 54/54, `npm run lint` clean, `vite build` passes and the bundle contains no demo code. In the browser on `npm run demo`: changed two days → "Plán uložen.", logged out and in again → the changed plan was loaded back; on the 375×812 mobile layout a change saved too; no console errors.

Not verified: the migration and the RLS policies against a real Supabase project (no project credentials here); the error states in the browser (covered only by unit tests).

## 2026-11-01 (4th run): UI redesign, settings, demo mode

Done:
- New design system in plain CSS: near-black surfaces, a deep purple accent (or blue / green / amber), soft gradients only on highlighted cards (the "last 7 days" tile, the chart, the login card), and one consistent style for buttons, inputs, segmented controls, cards and navigation. Inline styles and the old `screen.height` card sizing are gone.
- Responsive layout chosen by viewport width (`useMediaQuery`), with a manual override:
  - Desktop: a top bar plus one dashboard. On windows at least 900×700 it fits one screen and only the lists scroll; smaller or zoomed windows scroll the page. Records and the weekly plan share a tabbed card.
  - Mobile: an app bar, tabs (Přehled / Tréninky / Plán / Nastavení), a bottom tab bar with a central + button, 44 px touch targets, and the form as a full-screen sheet.
- Settings page: accent colour, spacing (comfortable / compact), layout (auto / desktop / mobile), units (kg / lb). Stored in `localStorage` (like the logged-in user) and validated on load (`src/lib/preferences.js`).
- Imperial units everywhere: summary, list, records, chart and form input. Storage stays in kg.
- A visible toggle for "stats from all workouts / filtered workouts". Before, it could only be switched by clicking a plan day, and never switched back.
- Native `<input type="date">` instead of the custom date chip (it also had a UTC parsing issue), labels on every form field, inline login errors, Escape and backdrop click close the dialog.
- `npm run demo`: an in-memory Supabase stand-in with sample data (`src/demo/`), swapped in by a Vite alias only in demo mode.
- 13 new unit tests for preferences and unit conversion (38 in total).

Verified in a browser on the demo (Node 22, Vite dev server):
- 1366×768, 1280×720 and 1920×1080: the dashboard fits the viewport with no page scroll.
- 1024×600: falls back to page scrolling.
- 768×1024 tablet, 390×844 and 360×640 phones, and 200% zoom (683×384): no horizontal overflow; all mobile controls are at least 44 px.
- Desktop forced on a phone and mobile forced on a monitor: all navigation reachable.
- Accent, density and units persisted across a reload; saving a workout in lb shows the same lb value again; edit, Escape, plan-day filtering and logout work.
- `npm run lint` clean, `npm test` 38/38, `vite build` passes, and the production bundle contains no demo code.

Not verified: real devices (only emulated viewports in a Chromium-based browser), Safari/Firefox, and the app against the real Supabase project.

## 2026-11-01 (3rd run): server.js is static-only

Done:
- Removed the old in-memory API from `server.js` (register/login with plaintext passwords, `x-user-id` header "auth", `/api/debug-users` listing every email). The app has used Supabase for auth and data since then, so nothing called it.
- `server.js` now only serves `my-react-app/dist`: long cache headers for hashed `/assets`, SPA fallback to `index.html`, JSON 404 for `/api/*`, no `X-Powered-By`. It exits with a clear message if the frontend isn't built. `createApp()` is exported for tests.
- Fixed the root `start` script (it pointed to a non-existent `server/` folder) and added `npm test`.
- Removed unused dependencies `pg`, `better-sqlite3` and `cors` (49 packages fewer in the lockfile).
- 12 server tests (`node:test` + `fetch` against a fake build folder) and a new `Server` CI workflow.

Verified: `npm test` at the root (12/12 on Node 18.12); manual run of `npm start` against the committed `dist/` (`/`, `/dashboard`, `/vite.svg` 200; `/api/login` JSON 404); missing build exits with code 1.

## 2026-11-01 (2nd run): Lint clean, 1RM progress chart

Done:
- Fixed all 4 lint errors and made lint blocking in CI.
  - `WorkoutForm` no longer copies its `initial*` props into state inside an effect; `App` remounts it with `key={editingId ?? "new"}` instead.
  - `WorkoutFilters`: removed the unused handlers and the dead `FakeDateInput` component (it also loaded an icon from a third-party site). The date pickers now call `onChange` with a plain object, like the type select, instead of an updater function that only worked because the parent passed `setFilters` directly.
  - `createDefaultWeeklyPlan` moved to `src/lib/weeklyPlan.js`; removed the unused `DAYS` constant.
- New: 1RM progress chart below the personal records. `oneRepMaxHistory()` in `stats.js` and `scaleSeries()` in the new `chart.js`, drawn as inline SVG without a chart library.
- 25 unit tests in 8 groups (6 new).

Verified: `npm test` (25/25 on Node 22.23, also passes on 18.12), `npm run lint` (0 problems), `vite build` on Node 22 in a fresh copy with a clean `npm ci`. Not verified: the chart in a browser (the app needs a Supabase login).

## 2026-11-01: Stats module, personal records, repo cleanup

Done:
- Moved filtering and statistics out of `App.jsx` / `StatsPanel.jsx` into pure functions in `my-react-app/src/lib/stats.js`.
- Fixed date handling: `new Date("YYYY-MM-DD")` is UTC midnight, so "last 7 days" could drop today's workout just after midnight (or shift by a day west of UTC). Dates are now parsed as local calendar days.
- New: a personal records panel showing the heaviest weight and the best estimated 1RM (Epley, sets of 1–10 reps) per exercise.
- 19 unit tests in 6 groups (`npm test`, built-in `node:test`).
- GitHub Actions workflow (Node 22): `npm ci`, test, lint (non-blocking), build.
- Stopped tracking `node_modules/` (root and frontend), `.DS_Store` files and `my-react-app/.env`. Added `my-react-app/.env.example`. The files are still in git history.
- Wrote the README.

Not verified locally: `vite build` and the UI. The local `node_modules` came from another OS (rollup and esbuild native binaries are missing) and the local Node is 18.12, below Vite 7's minimum. CI runs the build on Node 22.

## Next steps (in order)

1. Review `npm audit` (24 advisories in existing dependencies, 1 critical): update what has a compatible fix, and check which ones affect the production bundle rather than only dev tooling.
2. Replace the remaining `alert()`/`confirm()` calls (loading and deleting workouts) with inline messages, with tests.
3. Decide on the `workouts` schema gaps: a foreign key `user_id → auth.users on delete cascade` (check for orphaned rows first) and `created_at default now()`.
4. Store plan history (e.g. a `valid_from` date per plan) so adherence for past weeks uses the plan that applied then.
5. Optionally store the settings in Supabase user metadata, so they follow the account across devices.
6. Chart polish: date labels on the x axis, optional time-proportional spacing.
7. Delete the unused leftovers (`app.js`, `abl category/`, `controllers/`, `dao/`, `db.sqlite`, `users.json`) and the `ajv` dependency only `app.js` uses. Check with the owner first.
