// src/lib/history.js
// Helpers for logging quickly: what was done last time, and +/− steps for number inputs.
// Pure functions, tested with Vitest.
import { parseLocalDate } from "./stats.js"

// The most recent workout that contains `exerciseName` (matched
// case-insensitively, like personal records), with every entry of that
// exercise in it: { date, entries: [{ sets, reps, weight }] } or null.
//
// onOrBefore ("YYYY-MM-DD", optional): ignore workouts after this date, so
// editing an old workout shows what came before it, not what came later.
// The workout being edited should not be in `workouts`.
// Among workouts on the same date, the one listed first wins (the app keeps
// the list newest first).
export function lastPerformance(workouts, exerciseName, { onOrBefore } = {}) {
  const key = String(exerciseName || "").trim().toLowerCase()
  if (!key) return null
  const limit = parseLocalDate(onOrBefore) ? onOrBefore : null

  let best = null
  for (const w of workouts || []) {
    if (!parseLocalDate(w?.date)) continue
    if (limit && w.date > limit) continue
    if (best && w.date <= best.date) continue
    const entries = (w.exercises || [])
      .filter((ex) => String(ex?.name || "").trim().toLowerCase() === key)
      .map((ex) => ({ sets: Number(ex.sets) || 0, reps: Number(ex.reps) || 0, weight: Number(ex.weight) || 0 }))
    if (entries.length) best = { date: w.date, entries }
  }
  return best
}

// Adds `delta` to a number typed in an input and keeps it at or above `min`.
// An empty or invalid value starts from `min`. Rounded to 2 decimals, so
// repeated 2.5 steps never show values like 82.49999999.
export function stepNumber(value, delta, { min = 0 } = {}) {
  const n = Number(value)
  const start = value === "" || !Number.isFinite(n) ? min : n
  return Math.max(min, Math.round((start + delta) * 100) / 100)
}
