// src/lib/weeklyPlan.js
// The weekly plan: seven days, Monday first, each with a workout type or "off".
// Kept out of the component file so React Fast Refresh can treat WeeklyPlan.jsx
// as a component-only module, and so these pure helpers can be tested with `node --test`.
import { WORKOUT_TYPES } from "./workoutTypes.js"

export const DAY_NAMES = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"]

export const PLAN_TYPES = ["off", ...WORKOUT_TYPES.map((t) => t.value)]

const DEFAULT_TYPES = ["push", "pull", "legs", "off", "push", "pull", "off"]

export function createDefaultWeeklyPlan() {
  return planFromTypes(DEFAULT_TYPES)
}

function planFromTypes(types) {
  return DAY_NAMES.map((day, i) => ({ day, type: types[i] }))
}

// Only the types are stored (`weekly_plans.days`, a JSON array of 7 strings).
// Day names are UI labels, so renaming or translating them never needs a migration.
export function planToDays(plan) {
  return normalizeWeeklyPlan(plan).map((d) => d.type)
}

// Accepts what the database returns (an array of type strings) or a plan in
// the UI shape ([{ day, type }]). Anything malformed falls back to the default
// for that day, so a bad row can never break the plan UI.
export function normalizeWeeklyPlan(value) {
  const items = Array.isArray(value) ? value : []
  return planFromTypes(
    DEFAULT_TYPES.map((fallback, i) => {
      const item = items[i]
      const type = typeof item === "string" ? item : item?.type
      return PLAN_TYPES.includes(type) ? type : fallback
    })
  )
}
