# Progress log

## 2026-11-20 (23rd run, interactive): keep the screen on only during a workout

Next step 2 (the owner said to continue the plan). "Keep screen on" was all or nothing: on, it held the screen
whenever the app was open, e.g. while browsing history at home, which costs battery; off, the phone locked between
sets.

Acceptance criteria:
- *Nechat obrazovku zapnutou* has *Vyp.* / *Při tréninku* / *Vždy*. A stored `on` stays *Vždy*; the default stays off.
- *Při tréninku*: the lock is held while the workout form is open or a rest is running or has just ended, and for
  5 minutes after that (a set between rests); saving the workout ends it without the 5 minutes, once the rest
  started by the last exercise is over. The lock is never dropped and taken again between a rest and the grace period.
- The hint says it waits for a workout, or that the screen is being kept on.

Done:
- `src/lib/workoutSession.js`: `useWorkoutInProgress(busy)` → `{ active, finish }`, `WORKOUT_GRACE_MS`. The
  busy-to-idle switch is handled while rendering (React's "adjust state when a prop changes" pattern), so `active`
  has no false gap; a timeout ends the grace period.
- `App`: busy = form open (`view !== "dashboard"`) or `restTimer.running || restTimer.finished`; `workout.finish()`
  after a successful save; `useWakeLock(keepAwake === "on" || (keepAwake === "workout" && workout.active))`.
- `keepAwake` options `off` / `workout` / `on`; Settings labels and a `waiting` hint.
- 18 new tests (308 in total): 7 for the hook (grace period without a gap, a new rest within the grace period,
  save with and without a running rest, the next workout after a save, finish during the grace period), 2 Settings,
  1 preference, 3 App with a fake `navigator.wakeLock` (held from opening the form until the saved workout's rest is
  stopped, kept after closing without saving and requested once only, nothing with *Vyp.*); the old Settings test
  now picks *Vždy*.

Verified (Node 22): `vitest run` 308/308, ESLint clean, `vite build` passes. Mutations, 6 of 6 caught (no grace
period, grace after a save, `finished` never reset, form not counted, no `finish()` on save, a gap in the render).
Browser (`fitness-demo`, the pane was hidden, so a stand-in `wakeLock` and `visibilityState`): with *Při tréninku*,
starting a rest took the lock and stopping it kept it (hint *Zapnuto…*); a new workout saved and its rest stopped
went back to the *waiting* hint. A screenshot at 375 px shows the three choices fit, and also the rest notification
row from the 22nd run.

Not verified: a real lock on a phone; the 5-minute timeout in a real browser (covered by fake timers).

## 2026-11-20 (22nd run): rest timer notification in the background

Next step 2 from the list (step 4, per-exercise rep ranges, was done in parallel as the 21st run). The beep and *Pauza skončila* are easy to miss when the lifter switched to music or
a chat between sets, which is exactly when the rest ends.

Acceptance criteria:
- Settings → Trénink has *Upozornit na konec pauzy* (off by default). Switching it on asks for permission from
  that click; the hint says whether it works, is blocked (also while off), still needs an answer (with a
  *Povolit oznámení* button) or isn't supported (row disabled).
- A rest that ends while the page is hidden shows *Pauza skončila / Čas na další sérii.*; on screen, none.
- Coming back to the app or starting / dismissing the next rest closes it.
- Works on Android Chrome (needs a service worker) and desktop browsers; never throws where APIs are missing.

Done:
- `src/lib/restNotification.js`: `permissionOf`, `requestPermission` (promise and old callback form),
  `restWorker` (reuse or register `rest-sw.js`), `showRestDoneNotification` (worker first, page notification as
  the fallback), `closeRestNotifications`, and the `useRestNotifications(enabled)` hook (status + `enable()`,
  re-reads the permission on return to the page).
- `public/rest-sw.js`: no caching or fetch handler; `notificationclick` focuses the app or opens it.
- `useRestTimer`: a one-off timeout for the end besides the 250 ms interval (Chrome's intensive throttling slows
  repeating timers in long-hidden tabs to once a minute); a `done` flag keeps the signal to one.
- `restNotify` preference; `ChoiceRow` takes an optional `action` under the choices (`.setting-control-stack`).
- 27 new tests (290 in total): 18 for the module and hook, 2 for the end timeout, 5 Settings, 2 App (on: shown
  once in the background; off: none), 1 changed preference round trip.

Verified (Node 22): `vitest run` 290/290 (297/297 after merging main with #55), ESLint clean, `vite build` passes (copies `rest-sw.js` to `dist/`).
Mutations, 5 of 5 caught (no end timeout, shown while visible, shown with the setting off, no permission
request from Settings, not closed on return). Browser (demo, own worktree): the pane reports `denied`, and the
row says it's blocked; with a stand-in `Notification` the *ask* state shows a full-width *Povolit oznámení* at
375 px, and a 1:00 rest run past its end with the page marked hidden showed one notification (title, body,
tag) while the panel said *Pauza skončila*. `rest-sw.js` registered at `/`.

Not verified: a real system notification (the pane blocks them), Android Chrome's worker path, iOS.
Another scheduled session was editing the main clone (per-exercise rep ranges, PR #55) at the same time, so
this run worked in a separate git worktree and merged main in after #55 landed (conflicts only in docs, the
preferences header comment and the round-trip test).

## 2026-11-20 (21st run): rep range per exercise

Next step 4 from the list (step 1, the browser check, needs the demo server, and starting it was declined again).
One rep range for every exercise made the overload suggestion wrong for half of a workout: 6–10 is fine for a
bench press, but lateral raises are usually done for 12–15 and heavy squats for 4–6, so the app suggested adding
weight too early or too late.

Done:
- `preferences.js`: `exerciseRepRanges`, a map from exercise key (trimmed, lower case) to one of the allowed
  ranges. It shares one sanitizer with `plateLoading` (`sanitizeExerciseMap`: normalised keys up to 100
  characters, at most 200 entries). Unlike plate loading, a range equal to the general one is kept: it was
  chosen for this exercise and shouldn't move when the general range changes. `withExerciseRepRange(map, name, "")`
  removes it; `repRangeFor(name, map, general)` picks the one that applies.
- `WorkoutForm`: the suggestion uses the exercise's range, and a compact select *Rozsah pro tento cvik* under
  *Návrh* (first option *Obecný (6–10)*) changes it. Not shown for bodyweight entries (only +1 rep there) or
  without a change handler. App saves the choice in preferences.
- CSS: `.input-select.input-compact` (32 px, 44 px in the mobile layout).
- 7 new tests (270 in total): 3 for the preferences (sanitizer, set/remove, lookup), 3 form tests (own range
  wins, picker saves and goes back to *Obecný*, no picker without a handler or for bodyweight) and 1 App test
  (the choice lands in localStorage and is used the next time the form opens).

Verified (Node 22): `vitest run` 270/270, ESLint clean, `vite build` passes. Mutations, 2 of 2 caught (form
uses the general range, App doesn't pass the map). A third one (set "" instead of removing) is equivalent,
because the sanitizer drops it, so `withExerciseRepRange` was simplified to rely on that.

Not verified: the look in a real browser. The demo server start was declined in this unattended run. To check:
`npm run demo`, Nový trénink -> push -> Bench Press, change *Rozsah pro tento cvik*, at 375 px.

Note: another session was working in the main checkout (`feat/rest-notification`, rest timer notifications) at
the same time, so this run used a separate git worktree.

## 2026-11-19 (20th run): inline delete confirmation and error messages

Next step 4 from the list (step 1, the browser check, needs the demo server, and starting it was declined again).
`confirm()` and `alert()` block the page, can't be styled, look different in every browser, and some in-app
browsers suppress them, so a delete could go through without asking, or an error could be lost.

Done:
- `WorkoutList`: the trash button opens a row in the same card, *Smazat celý trénink? Nejde to vrátit.* with
  *Zrušit* (focused, the safe choice) and *Smazat*. Escape or *Zrušit* closes it and puts focus back on the
  trash button. Only one card asks at a time. While deleting, the card says *Mažu…* and its buttons are
  disabled. If `onDelete` rejects, the error stays in that card (`role="alert"`) and focus returns to the
  trash button; asking again clears it.
- `App`: `handleDeleteWorkout` no longer asks or alerts, it rethrows for the list. Loading errors go to
  `loadError`, shown above the list with *Zkusit znovu* (bumps `loadAttempt`, which re-runs the load effect).
  The empty text says *Tréninky se nenačetly.* instead of *Přidej první!*. A load answer that arrives after
  logout or a newer attempt is ignored (`cancelled` flag).
- CSS: `.btn-danger`, `.delete-confirm`, `.load-error`, 44 px buttons in the mobile layout.
- 10 new tests (263 in total): 7 for `WorkoutList` (ask/cancel/Escape/focus, one card at a time, busy state,
  failure, rejection without a message) and 3 App tests on the demo client (delete with cancel, failed delete
  then retry, failed load then *Zkusit znovu*). `confirm()` and `alert()` throw in these tests.

Verified (Node 22): `vitest run` 263/263, ESLint clean, `vite build` passes. Mutations, 4 of 4 caught (no
rethrow in App, trash deletes without asking, retry does nothing, no focus return).

Not verified: the look in a real browser (the confirm row on a narrow card, the danger button colours). The
`fitness-demo` start was declined in this unattended run. To check: `npm run demo`, delete a workout on desktop
and at 375 px.

## 2026-11-16 (19th run): plate calculator for machines and landmines

Next step 1 from the list. A leg press or hack squat has no bar to count, and a T-bar row is loaded on one end only,
so the barbell maths gave wrong answers (or no answer) for the most common plate-loaded exercises.

Done:
- `src/lib/plates.js`: `LOADINGS` (`barbell`, `machine`, `landmine`, `none`), `defaultLoading(name)` by name
  (landmine and machine names are checked before barbell, so *T-Bar Row (Barbell)* is a landmine),
  `loadingFor(name, overrides)` and `exerciseKey` (trimmed, lowercase). `loadBar` takes `sides` (1 or 2).
  Machines and landmines use a bar of 0: the logged weight is the plates, because sleds weigh differently.
- Preferences: `plateLoading`, a map from exercise key to loading. Sanitized: allowed values only, keys up to
  100 characters, at most 200 entries, and a choice equal to the default is dropped, so choosing the default
  again removes the entry (`withPlateLoading`).
- `PlateLoad`: *Na jeden konec: ...* for landmines, *(váha stroje se nepočítá)* for machines, and a select
  (*Naložení kotoučů*, visually hidden label) to change the loading for this exercise. *Nezobrazovat* keeps a
  short line with the select, so the calculator can be turned back on.
- `WorkoutForm` shows the calculator for exercises whose default or saved loading isn't `none`; App saves the
  choice in preferences.
- 28 new tests (253 in total): `loadBar` on one / two sides without a bar, `defaultLoading` for 14 names,
  overrides, the preference sanitizer (cap, key length, default dropped), 6 form tests (machine, custom T-bar
  row, picker, saved choices, no picker without a handler).

Verified (Node 26.13): `npx vitest run` 253/253, ESLint clean, `vite build` passes. Mutations, 4 of 4 caught
(sides ignored, overrides looked up without the key, no landmine detection, default choices kept).

CI: the first App test failed twice on this branch (never locally, also not on Node 22 with 2 workers): its
`renderApp` waited the default 1 s for the demo data, and that runner was about twice as slow as main's
(Settings tests 2.0 s vs 1.0 s; main's whole first test took 0.97 s). `renderApp` now waits up to 5 s.

Not verified: the look in a real browser. Starting `fitness-demo` was declined in this unattended run, so both
this and the 18th run's check are open. To check: `npm run demo`, Nový trénink -> legs -> *Leg Press* 180 kg,
switch the select to *Osa* and *Nezobrazovat*, reload (the choice should stay), at 375 px and in dark theme.

## 2026-11-13 (18th run): Plate calculator

Next step 1 from the list. Loading the bar is mental arithmetic every set ("100 kg is 40 a side, so 25 + 15"), and with an incomplete plate set the obvious answer is sometimes wrong. Strong and Hevy both have a plate calculator.

Done:
- New `src/lib/plates.js` (pure, tested):
  - `loadBar(target, { bar, plates })` returns the plates for one side (heaviest first), the loaded weight, what is missing and a status (`exact`, `under`, `belowBar`).
  - Not greedy: with only 15s and 10s, 20 a side is 10 + 10, but greedy takes a 15 and gets stuck. It's an unbounded-knapsack DP over the weight per side, counted in hundredths divided by the plates' gcd (1.25 kg stays exact; 1000 kg is a few thousand steps). Ties go to fewer plates, then heavier ones.
  - `BARS` (20 / 15 / 10 kg, 45 / 35 / 15 lb), `PLATES`, `DEFAULT_PLATES` (0.5 kg off by default), `isBarbellExercise(name)` by name (the exercise list has no equipment field).
  - Works in the display unit: plates are labelled in one unit, so 20 kg is not 44.09 lb on the bar.
- Preferences: `bar` (enum) and two list preferences, `platesMetric` / `platesImperial`, so switching units keeps both lists. `sanitizePreferences` got a `LIST_OPTIONS` table: only allowed values, no duplicates, canonical order; an empty list is valid (only the bar).
- Settings → Trénink: *Osa* (labels in the current unit) and *Dostupné kotouče* (checkbox chips in the segmented style, wrapping on narrow screens).
- Workout form: new `PlateLoad` component under sets/reps/weight for barbell exercises: *Kotouče: Na každou stranu: 25 + 15 kg (osa 20 kg).*, with a drawing of one sleeve (plate height by weight), or *přesně to nejde, naloženo 82,5 kg, o 0,5 kg méně*, or *Lehčí než prázdná osa*.
- 28 new tests (225 in total): 20 for `plates.js` (incl. two cases where greedy is wrong, float drift with 1.25 / 0.5, a 1000 kg timing check), 2 for the preferences, 3 for Settings, 3 for the form.

Verified (Node 26.13): `npm test` 225/225, `npm run lint` clean, `vite build` passes. Mutation check: with the DP turned off, 6 `plates.js` tests fail.

Not verified: the look in a real browser (the plate drawing, chip wrapping at phone width, dark theme). Starting the demo server didn't get approval in this unattended run. To check: `npm run demo`, Nastavení → Trénink (Osa, kotouče), then Nový trénink → *Bench Press (Barbell)*, weight 100 / 83 / 15, at 375 px.

## 2026-11-09: CI, workflow-guard checks the workflows

Why: workflow-guard 0.4.0 can now be used as a GitHub Action. With the pins from PR #32 the workflows have no findings left, so a check keeps them that way.

Done: `.github/workflows/workflow-guard.yml` runs `Gallileee/workflow-guard` on pushes to main and on PRs that change `.github/workflows/**`, with a read-only token. The action is pinned to the v0.4.0 commit (by `workflow-guard --fix` itself) with `# v0.4.0` in a comment, so Dependabot's `github-actions` entry updates it. Built on top of the `ci/pin-actions` branch (PR #32): on today's main the unpinned `@v7` actions would make the check fail.

Verified: `workflow-guard` locally reports 0 findings in all three workflow files; the new check runs on the PR itself.

## 2026-11-08: CI, actions pinned to commit SHAs

Why: after PR #31 (least-privilege token), [workflow-guard](https://github.com/Gallileee/workflow-guard) still reported four low WG001 findings: `actions/checkout@v7` and `actions/setup-node@v7` are tags, which can be moved to other code; a commit SHA can't.

Done: `workflow-guard --fix` pinned them in `frontend.yml` and `server.yml` to the commits the `v7` tags point to, keeping `# v7` in a comment, so the existing Dependabot `github-actions` entry keeps updating them. Only the four `uses:` lines changed.

Verified: `workflow-guard` reports 0 findings; CI runs on the PR.

## 2026-11-03 (17th run): Keep the screen on during a workout

Next step 1 from the list. Hevy has *Keep screen awake* in its settings: between sets the phone otherwise locks and the lifter has to unlock it to log the next set or watch the rest timer.

Done:
- New `src/lib/wakeLock.js`: a `useWakeLock(enabled)` hook over the Screen Wake Lock API, returning `unsupported | off | pending | active | error`.
  - The browser releases the lock when the tab is hidden, so it is requested again on `visibilitychange` once the page is visible.
  - Never holds or requests two locks at once (a guard for an in-flight request and a held sentinel).
  - Releases the lock when the setting goes off or the app unmounts; a request that resolves after that is released straight away.
  - Refusals (`NotAllowedError`, e.g. battery saver) become the `error` status instead of an alert.
  - The status is derived during render rather than set in the effect, which keeps the `react-hooks/set-state-in-effect` lint rule happy.
- New preference `keepAwake` (`off` / `on`, off by default because it costs battery), sanitized like the others.
- Settings → Trénink: a *Nechat obrazovku zapnutou* row (Vyp. / Zap.). Its hint follows the status; it's disabled with an explanation where the API is missing. Disabled segmented options are dimmed (CSS `:has()`).
- Fixed two App tests that only passed on push days: they chose Bench Press without picking the type, and the form now starts as today's planned type. They failed on main today (Tuesday); they now select *push* first, like `fillNewWorkout` does.
- 12 new tests (197 in total): 9 for the hook with a fake `navigator.wakeLock` and document, 3 for the Settings row; the preferences tests cover the new key.

Verified (Node 22.23): `npm test` 197/197, `npm run lint` clean, `vite build` passes. In the browser (`npm run demo`): the row is in Trénink, switching it on saves `keepAwake: "on"`, no console errors. The built-in preview browser refuses wake locks (`NotAllowedError: Wake Lock permission request denied`), so there the hint showed the error message as designed.

Not verified: the lock actually keeping a real phone awake. To check: open the deployed app on a phone, Nastavení → Trénink → *Zap.*, the hint should say *Obrazovka teď zůstane svítit*, then leave the phone idle past its auto-lock time.

Trade-off: the lock is held whenever the app is open with the setting on, not only during an "active workout", because the app has no workout-session state yet. Off by default for that reason.

## 2026-11-02 (16th run): CSV export of all workouts

Next step 1 from the list. Lifters expect to own their data: Strong and Hevy both export CSV from Settings, and an export is the first half of a later Strong / Hevy import.

Done:
- New `src/lib/csvExport.js` (pure, tested):
  - `workoutsToCsv()`: header `date,workout_type,exercise,sets,reps,weight_kg,note`, one row per exercise entry (the app has no per-set data), oldest first, undated workouts last. A workout without exercises keeps one row. Weight is always kg, as stored.
  - RFC 4180 quoting (comma, quote, line break), CRLF line endings.
  - CSV injection: text cells starting with `=`, `+`, `-`, `@`, tab or CR get a leading `'` (OWASP / Symfony CVE-2021-41270). Number columns are written as numbers and never prefixed.
  - `exportFileName()` (`workouts-2026-11-02.csv`, local date) and `csvBlob()` (UTF-8 with a BOM for Excel).
- Settings → Účet: an *Export tréninků* row with *Stáhnout CSV* (new `download` icon). The hint shows the count with Czech plurals; the button is disabled with no workouts. The file is built in the browser and saved through a temporary `blob:` link, so nothing is sent anywhere.
- App passes `workouts` to Settings.
- 13 new tests (185 in total): 11 for `csvExport.js`, 2 for Settings (disabled state; the click downloads a dated file with the expected rows and releases the blob URL).

Verified (Node 22.23): `npm test` 185/185, `npm run lint` clean, `vite build` passes.

Not verified: the download in a real browser. Starting the demo server was declined in this unattended run, so the button was only exercised in jsdom. To check: `npm run demo`, Nastavení → Účet → *Stáhnout CSV*, open the file in Google Sheets / LibreOffice.

Trade-off: comma separator (the RFC and what Google Sheets, LibreOffice and other trackers expect) rather than the semicolon Czech Excel uses by default.

## 2026-11-02 (15th run): Workout form fits an iPhone

Reported by the owner with a screenshot from an iPhone 15 Pro Max (430 px wide): in the workout form the sets / reps / weight numbers weren't visible, the date stuck out of its box, and the fields had different heights.

Causes and fixes (CSS, plus one class in `WorkoutForm.jsx`):
- **Steppers:** the 2 + 1 layout (Série + Opakování, then Váha full width) only started below 380 px, so a 430 px phone got three columns, leaving a few pixels for the number between − and +. It now applies to the whole mobile layout and to any screen up to 560 px. Number fields at 430 px: 92 / 92 / 288 px.
- **Date:** iOS Safari's native date input ignores `width: 100%` and centres its text. It now has `appearance: none`, a fixed height and left-aligned text, so it's as wide and as tall (46 px) as the type select.
- **Height:** smaller paddings and gaps in the phone form, and a shorter note field.
- **Footer:** one row on phones (rest timer and *Uložit*, half each) instead of two. *Zrušit* is hidden there, because the × in the header does the same. +30 s is hidden in that half-width pill; it's on the overview's big timer. The footer went from 129 to 71 px.

Verified in the browser (`npm run demo`, Chromium with emulated sizes):
- 430×932: *Přidat cvik* is on screen with 80 px to spare.
- 393×852: it just fits.
- 375×667: number fields 65 / 65 / 233 px, no horizontal overflow.
- Running timer: clock and × left, *Uložit* right, nothing overlapping.
- `npm test` 171/171, `npm run lint` clean, `vite build` passes.

Not verified: real iOS Safari. Its date control can only be checked on the phone itself.

## 2026-11-02 (14th run): Gym mode on the phone; no separate "Dnes" button

Requested by the owner:
- Remove the *Dnes: Push* button.
- Remove the weekly plan from the mobile overview.
- The mobile overview should show only what matters in the gym between sets.

Done:
- **No *Dnes: Push* button** (desktop top bar and mobile card). Its job moved into **Nový trénink / +**: a new workout now starts as today's, with today's date and, on a training day, the planned type and *Dnešní cviky*. So nothing was lost, and there's one less button.
- **Mobile *Přehled* = gym mode**, two cards only:
  - **Pauza**: a big clock (up to 5.5 rem). Idle: *Spustit 1:30* (the default length, 64 px) plus 1:00 / 2:00 / 3:00 (52 px). Running: +30 s and *Zastavit* (60 px). Done: *Pauza skončila* → *Jdu na sérii*. The app bar doesn't show a second timer on this page.
  - **Dnes**: today's planned type and the exercises logged today (e.g. *Bench Press 4×6 · 87,5 kg*), with *Upravit*.
- **Summary, 1RM chart and records** moved from the mobile overview to **Tréninky → Pokrok**, a *Seznam / Pokrok* switch at the top. The weekly plan stays on *Plán*. Desktop is unchanged apart from the removed button.
- Removed the now-unused `exercisesLabel` helper and the old Today card CSS.
- Tests:
  - Updated the app tests for the prefilled form: they clear the date and pick the type themselves.
  - New: + / Nový trénink starts today's workout; the mobile overview shows only the timer and *Dnes*, the timer starts and stops, and *Pokrok* has the summary, 1RM and records; `TodayCard` and `RestTimerPanel` component tests.
  - 171 in total.

The owner's screenshots differed between Vercel and my browser, but not because of a bug. Both run the same code. The demo account hadn't logged today's push yet (the real account had), and my test browser still had rose + fantasy saved from earlier tests. I reset my test browser's preferences before checking this change.

Verified (Node 22.23): `npm test` 171/171, `npm run lint` clean, `vite build` passes. In the browser (`npm run demo`):
- Mobile 375×812: the overview fits one screen with no overflow.
- + prefilled 02.11.2026, Push and the three exercises from 27 Oct; after saving, *Dnes* listed *Bench Press 4×6 · 87,5 kg* and the big timer ran.
- *Pokrok* shows the summary, 1RM and records.
- Desktop 1366×768: the top bar is the timer and *Nový trénink* only, and the dashboard still fits one screen.
- No console errors.

## 2026-11-02 (13th run): Weekly plan before personal records

Requested by the owner: the plan matters more than the records, so it should come first.
- Desktop: the side card's tabs are now *Týdenní plán* (first, open by default) and *Osobní rekordy*.
- Mobile overview: a *Týdenní plán* card right after the summary, above the 1RM chart, recent workouts and records. It shows this week, the last 8 weeks and the streak, and *Upravit* opens the Plan tab for editing.
- CSS: when the adherence block stands alone (the mobile card), it has no divider below it.
- 1 new test (163 in total): the plan tab is first and selected.

Verified: `npm test` 163/163, `npm run lint` clean. In the browser:
- 1366×768: the plan tab is selected and the dashboard still fits one screen.
- Mobile: the card order is Dnes, Souhrn, Týdenní plán, 1RM, Poslední tréninky, Osobní rekordy; no overflow; *Upravit* opens the Plan tab.

## 2026-11-02 (12th run): Settings redesign, more colours, game-style fonts

Requested by the owner: a nicer Settings page (the cards had different heights), more colours, and font styles inspired by games for more personality.

Research ([setproduct](https://setproduct.com/blog/settings-ui-design), [Cieden](https://cieden.com/book/atoms/toggle-switch/how-to-design-a-toggle-list), [Hevy settings](https://www.hevyapp.com/features/workout-settings/)):
- Group settings into labelled sections.
- Use segmented controls for 2–5 exclusive choices.
- Touch targets of at least 44 px.
- Labels that make sense on their own.
- Hevy also puts the default rest timer, a plate calculator and "keep screen on" in its workout settings.

Done:
- **Settings layout:**
  - Three sections with icons: *Vzhled* (left on wide screens), *Trénink* and *Účet* (right).
  - Every row has the same structure (title and hint on the left, control on the right) and the same height (96 px). Colours and fonts are full-width rows.
  - On phones the controls go under the text and are at least 44 px tall.
- **10 accent colours** (was 4): purple, blue, cyan, emerald, lime, amber, orange, rose, fuchsia, and black & white (`mono`). Each defines the full token set; white text only on the colours dark enough for it.
- **7 font styles** (`preferences.font`, `src/lib/fonts.js`): Výchozí, Arkáda (Press Start 2P), Terminál (VT323), Sci-fi (Audiowide), Fantasy (Cinzel), Komiks (Bangers), Taktické (Black Ops One).
  - All are OFL fonts that include Czech letters (latin-ext). They are bundled from Fontsource, so nothing is requested from Google Fonts, and each one is downloaded only when it is selected or Settings shows its preview.
  - Only headings and numbers use the style (brand, page and card titles, KPI values, 1RM, adherence, timer, workout dates). Body text and small uppercase labels stay in the readable UI font.
  - `font-size-adjust: cap-height …` makes the very different fonts about the same visual size.
  - Font cards show a live preview ("4×8 · 90") in their own font.
  - The UI doesn't use game names (trademarks); styles are named by genre.
- Fixed while testing:
  - The default preview card inherited the active style's font, because `--font-display: inherit` on a custom property inherits the parent's value.
  - The tiny uppercase section labels were unreadable in the pixel font, so they no longer use the display font.
  - Komiks looked smaller than the rest, which the switch from x-height to cap-height fixed.
- 8 new tests (162 in total): Settings sections, colours, fonts, training choices, account; font themes match the preferences; loading never throws; the whole app picks up the font and colour from Settings.

Verified (Node 22.23): `npm test` 162/162, `npm run lint` clean, `vite build` passes (fonts are separate chunks), and `npm audit --omit=dev` shows 0. In the browser (`npm run demo`):
- Desktop 1366×900: all non-wide rows are 96 px.
- 1366×768: the dashboard still fits one screen and the top bar stays one row with every font style.
- Mobile 375×812: no overflow, every choice at least 44 px.
- Tried arcade + lime, fantasy + rose, tactical + rose.

## 2026-11-02 (11th run): Rest timer in the top bar; email and logout only in Settings

Requested by the owner:
- The desktop top bar no longer shows the account email or a logout button. Both are in Settings (*Účet*: "Přihlášen jako …" and *Odhlásit se*).
- In their place the rest timer is always in the top bar: *Pauza 1:30* to start one while idle, the countdown with +30 s and stop while running, and *Pauza skončila* at the end.
- Removed the CSS that only existed to hide the email when space was short. The brand name no longer needs hiding either.
- Vibration is skipped before the user has interacted with the page. Chrome blocks it then and logs an error, which showed up during browser testing with scripted clicks.
- 2 new tests (154 in total): the top bar has the timer and no email or logout (which are in Settings), and no vibration without user activation.

Verified (Node 22.23): `npm test` 154/154, `npm run lint` clean. In the browser (`npm run demo`):
- With *Dnes: Push* also showing, the top bar is one row at 900, 1100 and 2560 px, idle and running.
- At 2560 px it still lines up with the cards (560 / 2000).
- +30 s shows from 1100 px up.

## 2026-11-02 (10th run): ESLint 10 and Vite 8

Replaces Dependabot's separate major-version PRs #19 (eslint), #20 (@eslint/js) and #21 (vite). Those failed CI on their own, because these packages have to move together: Vite 8 needs `@vitejs/plugin-react` 6, and ESLint 10 needs `@eslint/js` 10.

Done:
- Upgraded together:
  - `vite` 7.3.7 → 8.3.5 and `@vitejs/plugin-react` 5 → 6 (Vite 8 only).
  - `vitest` 5.0 → 5.1.
  - `eslint` 9 → 10.14 and `@eslint/js` 9 → 10.0.1.
  - `globals` 16 → 17.
- Read both migration guides first:
  - Vite 8 switches to Rolldown and Oxc and raises the default browser targets. The config uses none of the removed options (`rollupOptions`, `esbuild`, alias `customResolver`).
  - ESLint 10 adds three rules to `recommended`, and it now counts JSX (`<Card />`) as using a variable.
- No code changes were needed: lint (incl. the new recommended rules), all tests and the build passed straight away.
- `no-unused-vars`: dropped the `^[A-Z_]` exemption. It existed so that components used only in JSX weren't reported as unused, which ESLint 10 now handles itself. Unused components and constants are now reported, which I checked with a deliberately unused import (reported) and the same import used in JSX (not reported).
- README: Node requirement 20.19+ / 22.13+ (ESLint 10 needs 22.13 on Node 22), and the browser targets.

Bundle size, compared like for like (both on main's current dependencies, measured in a clean worktree):
- Vite 7: 495.3 kB (gzip 144.9 kB).
- Vite 8: 483.5 kB (gzip 139.7 kB), so 5 kB smaller gzipped.
- The bundle had grown before this change, because of the Supabase 2.99 → 2.118 update in #18.

Verified (Node 22.23, npm 11): `npm test` 152/152, `npm run lint` clean, `vite build` passes (154 ms, was ~1.2 s). `npm audit` shows the same 6 moderate `minimatch` advisories inside ESLint and nothing new. `npm run demo` runs on Vite 8.3.5, and I went through the main flow there:
- *Dnes: Push* → chip → Minule + Návrh → *Přidat cvik*.
- The rest timer started.
- Saving added a workout (24 → 25).
- A plan change showed *Plán uložen.* and adherence updated.
- No console errors and no Vite warnings.

## 2026-11-02 (9th run): Dependabot

Done:
- `.github/dependabot.yml`, version updates for three ecosystems:
  - **Frontend npm** (`/my-react-app`): weekly on Monday 06:00 Europe/Prague. Minor and patch updates are grouped into `frontend-dev-tools` and `frontend-runtime`; at most 5 open PRs; commit prefix `deps(frontend)`.
  - **Server npm** (`/`): weekly; minor and patch updates in one `server` group; at most 3 open PRs; prefix `deps(server)`.
  - **GitHub Actions** (`/`): monthly; all in one group; prefix `deps(ci)`.
  - Major versions are not grouped, so each comes as its own PR.
  - No custom labels: the repo doesn't have them, and Dependabot reports an error on every PR for a missing label. It adds its default `dependencies` label itself.
- README: a Dependabot paragraph in *Dependency audit*.

Verified:
- The file validates against the SchemaStore Dependabot schema (`dependabot-2.0.json`), checked with ajv + js-yaml from the repo's own `node_modules`.
- A deliberately invalid `interval` was rejected by the same check, so the validation really runs.

Not verified: Dependabot actually running. It starts only after this is merged to `main`; the first PRs should appear the following Monday.

Repository settings, not changed (they need the owner's go-ahead):
- **Dependabot alerts** are off (`GET /repos/…/vulnerability-alerts` → 404).
- **Dependabot security updates** are off (`automated-security-fixes` → `enabled: false`).

With these on, GitHub would also flag new vulnerabilities and open fix PRs immediately, not just on the weekly schedule.

## 2026-11-02 (8th run): Dependency audit

Before: frontend 24 advisories (1 critical, 12 high), server 7 (2 critical, 3 high).

Done:
- **Sorted the advisories by what they affect.**
  - Frontend production code had 1: `ws` through `@supabase/supabase-js`.
  - The server (`server.js`, Express) had 5, incl. the critical `proxy-addr` IP spoofing.
  - Everything else was dev tooling (Vite dev server, ESLint, the Supabase CLI).
- **Removed `express` from the frontend package.** It was listed in both `dependencies` and `devDependencies`, but no frontend code imports it. Also removed the frontend `start` script, which pointed to a `server.js` that doesn't exist there. The real static server is `server.js` at the repo root.
- **Ran `npm audit fix` (without `--force`) in both packages.** It only applies updates within the existing version ranges, e.g. Vite 7.3.1 → 7.3.7, esbuild, ws, express's dependencies, and tar in the Supabase CLI.
- **After:**
  - Server: 0.
  - Frontend production: 0.
  - Frontend dev: 6 moderate, all `minimatch < 11.0.1` inside ESLint. There's no fix, because ESLint 10 also uses `minimatch` 10. It's accepted and documented in the README: only ESLint reads those glob patterns, and they come from our own config.

Verified (Node 22.23, npm 11): `npm test` 151/151, `npm run lint` clean, `vite build` passes (no demo code in the bundle), server `npm test` 12/12. `npm run demo` starts on Vite 7.3.7 and the app loads with no console errors.

## 2026-11-02 (7th run): Rest timer

Done:
- `src/lib/restTimer.js`:
  - `useRestTimer()` stores the end time; a 250 ms interval checks it, but state only changes when the shown second does, so the app re-renders about once a second.
  - `remainingSeconds()` rounds up, `formatClock()`.
  - `signalRestDone()` vibrates (where supported) and plays a short Web Audio beep, and never throws.
- `RestTimer` component:
  - Full version in the workout form footer: start *Pauza 1:30*, or countdown with +30 s and stop, then *Pauza skončila · OK*.
  - Compact version in the desktop top bar and the mobile app bar while the form is closed.
- The timer lives in `App`, so it survives closing the form and switching pages. Adding an exercise starts it automatically.
- New setting **Pauza po přidání cviku**: off, 1:00, 1:30 (default), 2:00, 3:00.
- Top bar stays one row while the timer runs:
  - The email is hidden below 1280 px.
  - Below 1100 px, +30 s (still in the form) and the brand name are hidden.
  - The pill's close button is 28 px.
- On mobile the timer gets its own full-width row above Zrušit / Uložit.
- 13 new tests (151 in total):
  - Countdown, done, +30 s, stop, and a delayed-interval case, all with fake timers (`fireEvent`, because user-event waits on timers the fake clock controls).
  - Auto start on/off in the form.
  - A whole-app test that the timer keeps running after the dialog closes.
  - The extended preferences test.

Verified (Node 22.23): `npm test` 151/151, `npm run lint` clean, `vite build` passes. In the browser (`npm run demo`):
- After *Přidat cvik* the footer counted down from 1:30.
- After closing the form the top-bar pill kept counting.
- At the end the pill showed *Pauza skončila · OK*.
- The top bar is one row at 900, 1024 and 1222 px.
- On mobile the timer sits in the app bar and has its own row in the form (46 px buttons).
- No console errors.

Not verified: vibration and sound on a real phone (the emulated browser has neither).

## 2026-11-02 (6th run): Start today's workout from the plan

Done:
- `src/lib/todaysWorkout.js`:
  - `plannedTypeFor(plan, date)`.
  - `todaysWorkout(plan, workouts, today)`: today's planned type, whether it's already logged, and the exercise names from the newest earlier workout of that type, de-duplicated.
  - `exercisesLabel()`: Czech plurals.
- Desktop: a *Dnes: Push* button in the top bar (hidden on rest days and once today's planned workout is logged; the tooltip shows "3 cviky jako út 27. 10.").
- Mobile: a *Dnes* card at the top of the overview, with three states: *Začít*, rest day, or ✓ already logged.
- Workout form: a new `plannedExercises` prop shows *Dnešní cviky* as chips.
  - Tapping one selects it (or fills it in as a custom name if it isn't in the type's list), which fills in last time's numbers and shows the overload suggestion.
  - Added exercises get a ✓.
- 15 new tests (138 in total): 9 for the lib, 5 for the form, and 1 whole-app test that pins the date to a Friday with `vi.useFakeTimers({ toFake: ["Date"] })`.
- Fixed a stale comment in `adherence.js` (it still mentioned `node --test`).

Verified (Node 22.23): `npm test` 138/138, `npm run lint` clean, `vite build` passes. In the browser (`npm run demo`, Monday 2 Nov):
- *Dnes: Push* opened the form with 02.11.2026, Push and Bench / OHP / Triceps Pushdown from 27 Oct.
- Tapping Bench showed Minule + Návrh, and after adding it the chip got a ✓.
- After saving, the button disappeared.
- Mobile card showed "3 cviky jako út 27. 10.", or "✓ … je zapsaný" after logging.
- The top bar stays one row at 1024 and 1366 px, and the dashboard still fits one screen.
- No console errors.

## 2026-11-02 (5th run): Progressive overload suggestion

Done:
- `src/lib/progression.js`: `suggestProgression(last, { repRange, units })` using double progression:
  - Below the top of the range: +1 rep at the same weight.
  - At or above the top: the next plate step (2.5 kg / 5 lb, snapping odd weights up to the grid) and back to the bottom of the range.
  - Bodyweight: +1 rep.
  - The result is stored in kg; imperial steps are computed in lb.
- New setting **Rozsah opakování** (4–6, 6–10 default, 8–12, 12–15), validated with the other preferences.
- Workout form: under *Minule*, a *Návrh* row such as *4×7 · 87,5 kg (+1 opakování)* or *4×4 · 90 kg (horní hranice 4–6 → přidej váhu)*. The *Použít návrh* button fills it in. The prefill on choosing an exercise is still last time's numbers, so nothing heavier gets filled in without a tap.
- `WEIGHT_STEP` moved from the form to `progression.js`, so the − / + weight buttons and the suggestion share one step size.
- 15 new tests (123 in total): 10 for `progression.js`, 4 for the form, 1 whole-app test (rep range from Settings → suggestion). Also 1 extended preferences test.

Verified (Node 22.23): `npm test` 123/123, `npm run lint` clean, `vite build` passes. In the browser (`npm run demo`): Bench Press showed *Návrh: 4×7 · 87,5 kg (+1 opakování)* and *Použít návrh* filled in 4 / 7 / 87,5. On mobile (375×812) the rows wrap cleanly, buttons are 44 px, there is no overflow and there are no console errors.

Limitations: one rep range for all exercises; every logged set is assumed completed (no per-set data).

## 2026-11-02 (4th run): "Last time" numbers and − / + buttons in the workout form

Picked from the owner's list of features lifters value (Strong / Hevy comparisons): "previous" numbers next to each exercise and fast logging were the top two, and both are cheap with the existing data.

Done:
- `src/lib/history.js`:
  - `lastPerformance(workouts, name, { onOrBefore })`: the newest workout up to a date that contains the exercise (case-insensitive), with all its entries.
  - `stepNumber()`: +/− with a minimum and without floating-point drift.
- Workout form:
  - Choosing an exercise shows *Minule (út 27. 10.): 4×6 · 87,5 kg* and fills in sets, reps and weight (converted to lb when needed).
  - A custom name shows the hint while typing, with a *Použít* button.
  - App passes the other workouts as `history`, so an edited workout never shows itself.
- New `NumberStepper` component: − / + around the number input. Steps: 1 for sets and reps; 2.5 kg or 5 lb for weight. Buttons are 46 px on mobile, with labels like "Váha (kg): přidat 2,5".
- 18 new tests (108 in total): 11 for `history.js`, 6 for the form, 1 for the whole app.

Verified (Node 22.23): `npm test` 108/108, `npm run lint` clean, `vite build` passes. In the browser (`npm run demo`): Bench Press showed *Minule (út 27. 10.): 4×6 · 87,5 kg* and filled in 4 / 6 / 87,5, and + changed 87,5 to 90. On mobile (375×812): no overflow, buttons 46×46 px, no console errors.

Known: switching between the desktop and mobile layout while the dialog is open clears the form, because each layout renders its own dialog. This was already the case before.

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

1. Browser check of the plate calculator, with the machine / landmine loading and its picker (see the 18th and 19th runs), of the inline delete confirmation (20th run) and of the rep range picker (21st run). A real notification on an Android phone (22nd run; the browser pane blocks notifications, so only a stand-in was checked). Later, if wanted: a sled weight per machine (some lifters log plates + sled), and a way to turn the calculator on for exercises the name doesn't mark as plate-loaded.
2. Decide on the `workouts` schema gaps: FK `user_id → auth.users on delete cascade`, `created_at default now()`.
3. Store plan history so adherence for past weeks uses the plan that applied then.
4. Delete the unused leftovers (`app.js`, `abl category/`, `controllers/`, `dao/`, `db.sqlite`, `users.json`) and `ajv`. Check with the owner first.
