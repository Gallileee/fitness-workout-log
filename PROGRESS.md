# Progress log

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

1. **Persist the weekly plan** in Supabase (table `weekly_plans`, one row per user).
2. **Demo mode / seed data** so the UI (and the chart) can be tried without a Supabase account.
3. Component tests (Vitest + Testing Library), e.g. that `ProgressChart` falls back to the first exercise and renders one point per day.
4. Chart polish: date labels on the x axis, optional time-proportional spacing.
5. Delete the unused leftovers (`app.js`, `abl category/`, `controllers/`, `dao/`, `db.sqlite`, `users.json`) and the `ajv` dependency only `app.js` uses. Check with the owner first.
