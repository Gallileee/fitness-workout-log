// src/lib/planHistory.js
// Which weekly plan applied in which week. The history is a list of
// { weekStart: "YYYY-MM-DD" (a Monday), plan }, oldest first, at most one entry
// per week: the last plan saved that week. Pure functions, tested with Vitest.
import { parseLocalDate } from "./stats.js"
import { normalizeWeeklyPlan } from "./weeklyPlan.js"

// Rows from `weekly_plan_history` ({ week_start, days }) to history entries.
// Rows with a bad date are dropped; bad days fall back like any stored plan.
export function historyFromRows(rows) {
  const byWeek = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    const weekStart = row?.week_start
    if (!parseLocalDate(weekStart)) continue
    byWeek.set(weekStart, normalizeWeeklyPlan(row.days))
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([weekStart, plan]) => ({ weekStart, plan }))
}

// The plan for the week starting `weekStart`: the newest entry from that week
// or earlier. A week older than every entry gets the oldest entry, since that is
// the earliest plan known; with no history at all, `fallback` (the current plan).
export function planForWeek(history, weekStart, fallback) {
  if (!history?.length) return fallback
  let found = history[0]
  for (const entry of history) {
    if (entry.weekStart > weekStart) break
    found = entry
  }
  return found.plan
}
