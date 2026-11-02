// src/lib/todaysWorkout.js
// "Start today's workout": what the weekly plan says for today, and which
// exercises to do, taken from the last workout of that type. Pure functions,
// tested with Vitest.
import { parseLocalDate } from "./stats.js"
import { normalizeWeeklyPlan } from "./weeklyPlan.js"
import { toIsoDate } from "./adherence.js"

// The planned type ("push", ..., or "off") for the weekday of `date`.
export function plannedTypeFor(plan, date) {
  const mondayIndex = (date.getDay() + 6) % 7 // getDay(): 0 = Sunday
  return normalizeWeeklyPlan(plan)[mondayIndex].type
}

// {
//   date: "YYYY-MM-DD" (today),
//   type: planned type, or "off" on a rest day,
//   done: a workout of that type is already logged today,
//   exerciseNames: unique names from the newest earlier workout of that type, in its order,
//   sourceDate: that workout's date, or null when there is none,
// }
export function todaysWorkout(plan, workouts, today = new Date()) {
  const date = toIsoDate(today)
  const type = plannedTypeFor(plan, today)
  const result = { date, type, done: false, exerciseNames: [], sourceDate: null }
  if (type === "off") return result

  let source = null
  for (const w of workouts || []) {
    if (w?.type !== type || !parseLocalDate(w.date)) continue
    if (w.date === date) result.done = true
    else if (w.date < date && (!source || w.date > source.date)) source = w
  }
  if (!source) return result

  const seen = new Set()
  for (const ex of source.exercises || []) {
    const name = String(ex?.name || "").trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    result.exerciseNames.push(name)
  }
  result.sourceDate = source.date
  return result
}
