// src/lib/progression.js
// Progressive overload suggestion using double progression: keep the weight
// and add a rep each session until the top of the rep range, then add the
// smallest weight step and go back to the bottom of the range.
// Pure functions, tested with Vitest.
import { fromDisplayWeight, toDisplayWeight } from "./preferences.js"

// Smallest common weight step in the display unit (a pair of the lightest plates).
export const WEIGHT_STEP = { metric: 2.5, imperial: 5 }

// "6-10" -> [6, 10]. Invalid values fall back to 6–10.
export function parseRepRange(value) {
  const match = /^(\d+)-(\d+)$/.exec(String(value || ""))
  const [min, max] = match ? [Number(match[1]), Number(match[2])] : [6, 10]
  return min >= 1 && max >= min ? [min, max] : [6, 10]
}

// The next weight step strictly above `weight`, so odd weights snap to the plate
// grid: 87.5 -> 90, 83 -> 85, and 181.9 lb -> 185 lb.
function nextStep(weight, step) {
  return (Math.floor(weight / step + 1e-9) + 1) * step
}

// last: { sets, reps, weight } from the last session (weight in kg).
// Returns { sets, reps, weight (kg), reason } or null when there is nothing to build on.
// reason: "reps"       same weight, one more rep
//         "weight"     top of the range reached: heavier, back to the bottom of the range
//         "bodyweight" no weight logged: one more rep
export function suggestProgression(last, { repRange = "6-10", units = "metric" } = {}) {
  const sets = Math.trunc(Number(last?.sets))
  const reps = Math.trunc(Number(last?.reps))
  const weight = Number(last?.weight) || 0
  if (!(sets >= 1) || !(reps >= 1) || weight < 0) return null

  const [min, max] = parseRepRange(repRange)
  if (weight === 0) return { sets, reps: reps + 1, weight: 0, reason: "bodyweight" }
  if (reps < max) return { sets, reps: reps + 1, weight, reason: "reps" }

  const step = WEIGHT_STEP[units] ?? WEIGHT_STEP.metric
  const heavier = nextStep(toDisplayWeight(weight, units), step)
  return { sets, reps: min, weight: fromDisplayWeight(heavier, units), reason: "weight" }
}
