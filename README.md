# fitness-workout-log

A web app for logging gym workouts (push / pull / legs and more): record exercises with sets, reps and weight, filter your history, plan your training week and track progress with statistics and personal records.

It exists because most workout apps are either paid or bloated. This one does the few things I need: fast logging, a weekly PPL plan, and numbers that show progress.

## Features

- Sign up / log in (Supabase Auth); every user sees only their own workouts
- Create, edit and delete workouts (date, type, exercises, note), choosing exercises from a built-in list or entering custom ones
- **Start today's workout**: the plan knows today is, say, push day. *Dnes: Push* (top bar) or *Začít* (mobile overview) opens the form with today's date, the planned type and the exercises from your last push workout as one-tap buttons (*Dnešní cviky*). Tapping one fills in last time's numbers; added ones get a ✓
- **Last time** (*Minule*): choosing an exercise shows what you did the last time you logged it, for example *4×6 · 87,5 kg*, and fills in sets, reps and weight from it
- **Overload suggestion** (*Návrh*): the next step after last time, using double progression (e.g. *4×7 · 87,5 kg (+1 opakování)*), applied with one tap; the rep range is set in Settings
- **Rest timer**: adding an exercise starts a countdown (1:30 by default; 1:00–3:00 or off in Settings), and *Pauza 1:30* starts one by hand, e.g. between sets. It's in the form and, on desktop, always in the top bar (on mobile the app bar shows it while it runs). It has +30 s and stop, keeps running when the form is closed, and vibrates and beeps when it ends
- **− / + buttons** for sets, reps and weight (steps of 1, and 2.5 kg or 5 lb), so common changes take one tap
- Filter the history by workout type and date range (both dates inclusive)
- Summary: number of workouts, total volume (sets × reps × kg), volume over the last 7 days, average volume per workout
- **Personal records**: the heaviest weight and the best estimated one-rep max for each exercise
- **1RM progress chart**: pick an exercise and see its best estimated one-rep max per training day, with the change since the first logged day
- Weekly PPL plan, **saved to your account** (Supabase table `weekly_plans`); clicking a day filters the history by that day's workout type
- **Plan adherence**: this week day by day (done / different type / missed / upcoming), completion for each of the last 8 weeks, and a streak of fully completed weeks
- Summary statistics for all workouts or only the filtered ones (toggle above the tiles)
- **Settings** (saved in the browser), in three sections (Vzhled, Trénink, Účet) of equal-height rows: 10 accent colours, 7 **font styles** for headings and numbers in the mood of game genres (arcade, terminal, sci-fi, fantasy, comic, tactical, or the default), comfortable/compact spacing, Auto/Desktop/Mobile layout, metric (kg) or imperial (lb) units, rep range for the overload suggestion (4–6, 6–10, 8–12, 12–15), rest timer length
- **Demo mode** (`npm run demo`): the full app with sample data and no Supabase project

## Layout

- **Desktop** (wide windows): a top bar with navigation, the rest timer, *Dnes* and *Nový trénink* (the account email and logout are in Settings), then one dashboard with summary tiles, the filterable workout list, the 1RM chart, and tabs for the weekly plan (first, open by default) and records. On windows at least 900×700 px it fits exactly one screen and only the lists scroll inside their cards. On shorter or zoomed-in windows the page scrolls normally instead of squeezing the content.
- **Mobile** (≤ 760 px, or chosen in Settings): an app bar, one section per tab (Overview with today's workout, summary and the weekly plan's progress above the chart and records; Workouts; Plan; Settings) and a bottom tab bar with a central + button. Touch targets are at least 44 px, and the workout form opens as a full-screen sheet.
- *Auto* picks the layout from the viewport width. A manual choice always keeps the navigation reachable: the desktop layout wraps on a phone, and the mobile layout is a centred column on a monitor.

## Tech stack

| Part | Choice |
| --- | --- |
| Frontend | React 19 + Vite 8 (`my-react-app/`) |
| Auth + database | Supabase (Postgres tables `workouts` and `weekly_plans`, called directly from the browser) |
| Statistics | Pure functions in `my-react-app/src/lib/stats.js` |
| Weekly plan | Model in `src/lib/weeklyPlan.js`, loading/saving in `src/lib/weeklyPlanStore.js` |
| Fonts | Inter / system UI font for text; 6 OFL display fonts from Fontsource (Press Start 2P, VT323, Audiowide, Cinzel, Bangers, Black Ops One), bundled and each downloaded only when used |
| Charts | Hand-written inline SVG (`src/lib/chart.js` does the scaling), no chart library |
| Styling | Plain CSS with design tokens (custom properties) for colours, spacing and accent themes; media and container queries for layout. No UI or icon library |
| Tests | Frontend: Vitest + React Testing Library in jsdom (unit, component and whole-app tests). Server: built-in `node:test` |
| Static server | Express (`server.js`): serves `my-react-app/dist` only, no API |
| CI | GitHub Actions: install, test, lint, build |

## Setup

Requires **Node.js 20.19+ or 22.13+** (needed by Vite 8 and ESLint 10).

The production build targets the browsers Vite 8 supports by default: Chrome / Edge 111+, Firefox 114+ and Safari 16.4+.

```bash
cd my-react-app
npm install
cp .env.example .env    # then fill in your Supabase URL and anon key
npm run dev             # http://localhost:5173
```

To try the app without Supabase, run `npm run demo` instead. It swaps the Supabase client for an in-memory one with eight weeks of sample workouts (`src/demo/`). Changes are lost on reload, and the demo client is never included in `npm run build`.

### Supabase tables

The SQL for both tables is in [`supabase/migrations/`](supabase/migrations/). Run the files in name order in the Supabase SQL editor (or with `supabase db push`) to set up a new project:

| File | What it does |
| --- | --- |
| `20261101000000_workouts.sql` | The `workouts` table as it exists in the live project, with RLS. Don't run it on the live project; it already has the table. |
| `20261102000000_weekly_plans.sql` | The `weekly_plans` table (see below). Already applied to the live project. |
| `20261103000000_workouts_user_date_index.sql` | An index on `workouts (user_id, date desc)` for the app's main query. Already applied to the live project. |

`workouts` columns: `id` (uuid, primary key), `user_id` (uuid), `date` (date), `type` (text: `push`, `pull`, `legs`, `fullbody`, `core`, `other`), `exercises` (jsonb: `[{ id, name, sets, reps, weight }]`, weight in kg), `note` (text), `created_at` (timestamptz).

Row Level Security is on for both tables, and users can only reach their own rows. The anon key ships to the browser, so RLS is what keeps users' data separate.

### Weekly plan table

Run [`supabase/migrations/20261102000000_weekly_plans.sql`](supabase/migrations/20261102000000_weekly_plans.sql) in the Supabase SQL editor. It creates `weekly_plans` (one row per user: `user_id` primary key, `days` = a JSON array of 7 workout types, Monday first, `updated_at`) with RLS policies that let users read, create and update only their own row.

Without the table the app still works: the plan shows the default, edits stay in the page until reload, and the plan card says it couldn't be loaded or saved.

### Production build

```bash
cd my-react-app && npm run build   # outputs my-react-app/dist
cd .. && npm install && npm start  # serves the build on http://localhost:3000 (PORT to change)
```

## Tests

```bash
cd my-react-app
npm test            # all frontend tests once (Vitest)
npm run test:watch  # re-run tests on every file change
npm run lint        # must pass; CI fails on lint errors

cd ..
npm test        # server tests: static files, SPA fallback, removed API returns 404
```

What the frontend tests cover:
- `src/lib/*.test.js`: the pure logic (statistics, dates, units, weekly plan, adherence, the save queue).
- `src/components/*.test.jsx`: components as a user sees them: found by their labels and roles, driven with `user-event` (typing, clicking, choosing options). Includes the workout form's validation.
- `src/App.test.jsx`: the whole app on top of the in-memory demo client: adding a workout, saving the plan, and what happens when the server fails (the form stays open with the error and the entered data).

`src/test/setup.js` adds stand-ins for browser APIs that jsdom lacks (`matchMedia`, `ResizeObserver`) and cleans up after each test.

## Dependency audit

`npm audit` (last checked 2026-11-02):
- **Server** (repo root): 0 vulnerabilities.
- **Frontend production dependencies** (`npm audit --omit=dev` in `my-react-app`): 0 vulnerabilities.
- **Frontend dev tooling**: 6 moderate advisories, all from `minimatch < 11.0.1` inside ESLint ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), DoS through crafted glob patterns). There is no fix: ESLint 10, which the project uses, still depends on `minimatch` 10. Only ESLint reads those patterns, and they come from our own config, so the risk is accepted. Check again when ESLint moves to `minimatch` 11.

To re-check:

```bash
cd my-react-app && npm audit && npm audit --omit=dev
cd .. && npm audit
```

**Dependabot** ([`.github/dependabot.yml`](.github/dependabot.yml)) opens update PRs every Monday morning (Prague time). CI runs on them like on any PR.
- Frontend: minor and patch updates come grouped into one PR for dev tools and one for runtime packages (React, Supabase), at most 5 open at a time.
- Server: minor and patch updates in one PR.
- GitHub Actions: checked monthly, in one PR.
- Major versions come as separate PRs, one per package, so each breaking change can be reviewed on its own.

## How the statistics work

- **Volume** = Σ sets × reps × weight. Missing, negative or non-numeric values count as 0.
- **Last 7 days** = today and the 6 calendar days before it. Workout dates (`YYYY-MM-DD`) are read as local calendar days, not UTC timestamps, so the result doesn't depend on your timezone or the time of day.
- **Estimated 1RM** uses the Epley formula `weight × (1 + reps / 30)`. Only sets with 1–10 reps count, because the estimate gets unreliable at higher rep counts. A single rep counts as its own weight.
- **Personal records** merge exercise names case-insensitively and skip bodyweight entries (weight 0).
- **Units**: weights are always stored in kg. In imperial mode they are shown and typed in lb (1 lb = 0.45359237 kg); typed pounds are saved to 0.01 kg, so they show the same value again.
- **Today's workout** = the planned type for today's weekday. Its exercises come from the newest *earlier* workout of that type, with duplicates (case-insensitive) removed. The shortcut is hidden on rest days and once a workout of the planned type is logged today. An exercise that isn't in the built-in list for that type is filled in as a custom name.
- **Last time** = the newest workout, on or before the date of the workout being entered, that contains the exercise (names matched case-insensitively). An edited workout never shows itself. If the exercise appears several times in that workout, all entries are shown and the first one is filled in. For a custom name the hint appears while typing, and *Použít* fills it in.
- **Overload suggestion** (double progression, `src/lib/progression.js`), built from the first entry of last time:
  - Below the top of the rep range (default 6–10): same weight, one more rep.
  - At or above the top: the next weight step (2.5 kg, or 5 lb in imperial mode), back to the bottom of the range. Odd weights snap up to the plate grid (83 → 85 kg).
  - Bodyweight entries (weight 0): one more rep.
  - It assumes every logged set was completed, because the app stores one row per exercise (e.g. 4×6), not each set.
- **Rest timer** (`src/lib/restTimer.js`): it stores the time it ends, not a tick count, so it stays right when the browser slows down timers in a background tab or on a locked phone. Vibration needs a phone browser that supports it (not iOS Safari); the beep uses the Web Audio API.
- **Weekly plan saving**: each change is saved with an upsert on `user_id`. At most one save runs at a time; changes made meanwhile are merged and only the newest plan is sent next, so a slow request can't overwrite a newer plan. The card shows *Ukládám… / Plán uložen.* or the error.
- **Plan adherence**: weeks run Monday to Sunday. This week, a planned day is *done* when a workout of the planned type was logged that date. For the 8-week bars, days may move within the week: for each type, completed = min(planned sessions, logged workouts of that type), so three legs days don't make up for a missed push day. The streak counts fully completed weeks back from last week; the current week joins it once it's complete, so the streak doesn't reset every Monday.
- **1RM chart** shows one point per training day: the best estimate from any set that day. Points are evenly spaced, so the x axis shows the order of sessions, not the time between them.

## Limitations

- Settings are stored per browser (`localStorage`), not in the Supabase account, so they don't follow you to another device.
- The overload suggestion uses one rep range for all exercises, and can't tell a failed set from a completed one.
- Plan adherence measures past weeks against the *current* plan, because older versions of the plan aren't stored.
- The UI text is Czech only.
- The 1RM chart has no axis labels; exact values are in the point tooltips and the caption.
- `app.js`, `abl category/`, `controllers/` and `dao/` are leftover experiments and are not used by the app.

## Next steps

See [PROGRESS.md](PROGRESS.md).
