# fitness-workout-log

A web app for logging gym workouts (push / pull / legs and more): record exercises with sets, reps and weight, filter your history, plan your training week and track progress with statistics and personal records.

It exists because most workout apps are either paid or bloated. This one does the few things I need: fast logging, a weekly PPL plan, and numbers that show progress.

## Features

- Sign up / log in (Supabase Auth); every user sees only their own workouts
- Create, edit and delete workouts (date, type, exercises, note), choosing exercises from a built-in list or entering custom ones
- Filter the history by workout type and date range (both dates inclusive)
- Summary: number of workouts, total volume (sets × reps × kg), volume over the last 7 days, average volume per workout
- **Personal records**: the heaviest weight and the best estimated one-rep max for each exercise
- **1RM progress chart**: pick an exercise and see its best estimated one-rep max per training day, with the change since the first logged day
- Weekly PPL plan; clicking a day filters the history by that day's workout type

## Tech stack

| Part | Choice |
| --- | --- |
| Frontend | React 19 + Vite 7 (`my-react-app/`) |
| Auth + database | Supabase (Postgres table `workouts`, called directly from the browser) |
| Statistics | Pure functions in `my-react-app/src/lib/stats.js` |
| Charts | Hand-written inline SVG (`src/lib/chart.js` does the scaling), no chart library |
| Tests | Built-in `node:test` runner, no extra dependencies |
| Static server | Express (`server.js`), serves `my-react-app/dist` |
| CI | GitHub Actions: install, test, lint, build |

## Setup

Requires **Node.js 20.19+ or 22.12+** (needed by Vite 7).

```bash
cd my-react-app
npm install
cp .env.example .env    # then fill in your Supabase URL and anon key
npm run dev             # http://localhost:5173
```

### Supabase table

The app expects a `workouts` table roughly like this (inferred from the frontend code):

| Column | Type |
| --- | --- |
| `id` | bigint / identity, primary key |
| `user_id` | uuid, references `auth.users` |
| `date` | date |
| `type` | text (`push`, `pull`, `legs`, `fullbody`, `core`, `other`) |
| `exercises` | jsonb: `[{ id, name, sets, reps, weight }]` |
| `note` | text |

Enable Row Level Security with a policy like `user_id = auth.uid()`. The anon key ships to the browser, so RLS is what keeps users' data separate.

### Production build

```bash
cd my-react-app && npm run build   # outputs my-react-app/dist
cd .. && node server.js            # serves the build on http://localhost:3000
```

## Tests

```bash
cd my-react-app
npm test        # unit tests for src/lib (stats and chart scaling)
npm run lint    # must pass; CI fails on lint errors
```

## How the statistics work

- **Volume** = Σ sets × reps × weight. Missing, negative or non-numeric values count as 0.
- **Last 7 days** = today and the 6 calendar days before it. Workout dates (`YYYY-MM-DD`) are read as local calendar days, not UTC timestamps, so the result doesn't depend on your timezone or the time of day.
- **Estimated 1RM** uses the Epley formula `weight × (1 + reps / 30)`. Only sets with 1–10 reps count, because the estimate gets unreliable at higher rep counts. A single rep counts as its own weight.
- **Personal records** merge exercise names case-insensitively and skip bodyweight entries (weight 0).
- **1RM chart** shows one point per training day: the best estimate from any set that day. Points are evenly spaced, so the x axis shows the order of sessions, not the time between them.

## Limitations

- The weekly plan is not saved; it resets on reload.
- The 1RM chart has no axis labels; exact values are in the point tooltips and the caption.
- The root `package.json` `start` script points to a `server/` folder that doesn't exist. Use `node server.js` instead.
- `server.js` still has an unused in-memory user/workout API from before the switch to Supabase (plaintext passwords, `x-user-id` header auth). It should be removed or rewritten.
- `app.js`, `abl category/`, `controllers/` and `dao/` are leftover experiments and are not used by the app.

## Next steps

See [PROGRESS.md](PROGRESS.md).
