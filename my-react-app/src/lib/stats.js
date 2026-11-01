// src/lib/stats.js
// Pure functions for filtering workouts and computing statistics.
// No React and no Supabase here, so everything can be unit tested with `node --test`.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

// "2026-03-14" -> local midnight of that day, or null when the value isn't a valid date.
// new Date("2026-03-14") would be UTC midnight, which is the previous evening in
// timezones west of UTC and shifts day-based comparisons.
export function parseLocalDate(value) {
  const match = ISO_DATE.exec(value || "")
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d)
  // Rejects overflowing values such as 2026-02-31.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const EMPTY_FILTERS = { type: "all", from: "", to: "" }

// filters = { type: "all" | "push" | ..., from: "YYYY-MM-DD" | "", to: "YYYY-MM-DD" | "" }
// Both date bounds are inclusive. Workouts without a valid date are dropped
// only when a date bound is set.
export function filterWorkouts(workouts, filters) {
  const { type = "all", from = "", to = "" } = filters || {}
  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)

  return (workouts || []).filter((w) => {
    if (type !== "all" && w.type !== type) return false
    if (!fromDate && !toDate) return true
    const date = parseLocalDate(w.date)
    if (!date) return false
    if (fromDate && date < fromDate) return false
    if (toDate && date > toDate) return false
    return true
  })
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Training volume = sum of sets × reps × weight (kg) over all exercises.
export function workoutVolume(workout) {
  return (workout?.exercises || []).reduce(
    (sum, ex) => sum + toNumber(ex.sets) * toNumber(ex.reps) * toNumber(ex.weight),
    0
  )
}

// "Last 7 days" = today and the 6 calendar days before it.
export function summarize(workouts, today = new Date()) {
  const list = Array.isArray(workouts) ? workouts : []
  const end = startOfDay(today)
  const start = new Date(end)
  start.setDate(end.getDate() - 6)

  const totalVolume = list.reduce((sum, w) => sum + workoutVolume(w), 0)
  const volumeLast7Days = list
    .filter((w) => {
      const date = parseLocalDate(w.date)
      return date && date >= start && date <= end
    })
    .reduce((sum, w) => sum + workoutVolume(w), 0)

  return {
    totalWorkouts: list.length,
    totalVolume,
    volumeLast7Days,
    avgVolumePerWorkout: list.length > 0 ? Math.round(totalVolume / list.length) : 0,
  }
}

// Above ~10 reps the estimate gets unreliable, so such sets don't count.
export const MAX_REPS_FOR_1RM = 10

// Estimated one-rep max with the Epley formula: weight × (1 + reps / 30).
// Returns null when the set can't give a meaningful estimate.
export function estimateOneRepMax(weight, reps) {
  const w = toNumber(weight)
  const r = toNumber(reps)
  if (!w || !r || !Number.isInteger(r) || r > MAX_REPS_FOR_1RM) return null
  if (r === 1) return w
  return Math.round(w * (1 + r / 30) * 10) / 10
}

// Best lifts per exercise across all workouts. Exercise names are matched
// case-insensitively; bodyweight entries (weight 0) are skipped.
// Returns [{ name, bestWeight, bestWeightDate, bestE1rm, bestE1rmDate }] sorted by name.
export function personalRecords(workouts) {
  const records = new Map()

  for (const w of workouts || []) {
    for (const ex of w.exercises || []) {
      const name = String(ex.name || "").trim()
      const weight = toNumber(ex.weight)
      if (!name || !weight) continue

      const key = name.toLowerCase()
      const rec = records.get(key) || {
        name,
        bestWeight: 0,
        bestWeightDate: null,
        bestE1rm: null,
        bestE1rmDate: null,
      }
      if (weight > rec.bestWeight) {
        rec.bestWeight = weight
        rec.bestWeightDate = w.date || null
      }
      const e1rm = estimateOneRepMax(weight, ex.reps)
      if (e1rm !== null && (rec.bestE1rm === null || e1rm > rec.bestE1rm)) {
        rec.bestE1rm = e1rm
        rec.bestE1rmDate = w.date || null
      }
      records.set(key, rec)
    }
  }

  return [...records.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// Best estimated 1RM per day for one exercise, oldest first: [{ date, e1rm }].
// The name is matched case-insensitively, like in personalRecords. Workouts
// without a valid date are skipped because they can't be placed on a timeline.
export function oneRepMaxHistory(workouts, exerciseName) {
  const key = String(exerciseName || "").trim().toLowerCase()
  if (!key) return []

  const bestByDate = new Map()
  for (const w of workouts || []) {
    if (!parseLocalDate(w.date)) continue
    for (const ex of w.exercises || []) {
      if (String(ex.name || "").trim().toLowerCase() !== key) continue
      const e1rm = estimateOneRepMax(ex.weight, ex.reps)
      if (e1rm === null) continue
      const prev = bestByDate.get(w.date)
      if (prev === undefined || e1rm > prev) bestByDate.set(w.date, e1rm)
    }
  }

  // ISO dates sort correctly as strings.
  return [...bestByDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, e1rm]) => ({ date, e1rm }))
}
