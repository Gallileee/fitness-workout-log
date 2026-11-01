# Progress log

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

1. **Fix the 4 existing lint errors**, then make lint blocking in CI: `setState` inside an effect (`WorkoutForm.jsx:34`; remount the form with a `key` instead), unused `handleFromChange` / `handleToChange` (`WorkoutFilters.jsx`), and `createDefaultWeeklyPlan` exported from a component file (`WeeklyPlan.jsx`; move it to `src/lib/`).
2. **Remove or rewrite `server.js`'s unused API** (plaintext passwords, `x-user-id` auth). Keep only the static file serving, and fix the root `start` script.
3. **Persist the weekly plan** in Supabase (table `weekly_plans`, one row per user).
4. **Progress chart**: estimated 1RM over time for a chosen exercise, reusing `estimateOneRepMax`.
5. Component tests (Vitest + Testing Library) once the frontend runs on Node 20+.
