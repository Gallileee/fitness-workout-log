// src/lib/preferences.js
// User preferences (accent colour, font style, spacing, layout, units, rep ranges, rest timer and its notification, screen on,
// bar and plates), stored in localStorage
// like the logged-in user. Pure helpers, so they can be tested with `node --test`.

import { DEFAULT_PLATES, LOADINGS, PLATES, defaultLoading, exerciseKey } from "./plates.js"

export const STORAGE_KEY = "preferences"

export const OPTIONS = {
  accent: ["purple", "blue", "cyan", "emerald", "lime", "amber", "orange", "rose", "fuchsia", "mono"],
  // Font style for headings and numbers (src/lib/fonts.js).
  font: ["default", "arcade", "terminal", "scifi", "fantasy", "comic", "tactical"],
  density: ["comfortable", "compact"],
  layout: ["auto", "desktop", "mobile"],
  units: ["metric", "imperial"],
  // Rep range for the progressive overload suggestion (src/lib/progression.js).
  repRange: ["4-6", "6-10", "8-12", "12-15"],
  // Rest timer started after adding an exercise, in seconds (src/lib/restTimer.js).
  restTimer: ["off", "60", "90", "120", "180"],
  // System notification when the rest ends while the app is in the background (src/lib/restNotification.js).
  restNotify: ["off", "on"],
  // Keep the screen on (src/lib/wakeLock.js): never, during a workout (src/lib/workoutSession.js),
  // or whenever the app is open ("on", the older choice, kept under its name).
  keepAwake: ["off", "workout", "on"],
  // Bar for the plate calculator (src/lib/plates.js).
  bar: ["standard", "light", "technique"],
}

// Preferences holding a list: the plates the gym has, one list per unit.
export const LIST_OPTIONS = {
  platesMetric: PLATES.metric,
  platesImperial: PLATES.imperial,
}

export const DEFAULT_PREFERENCES = {
  accent: "purple",
  font: "default",
  density: "comfortable",
  layout: "auto",
  units: "metric",
  repRange: "6-10",
  restTimer: "90",
  restNotify: "off",
  keepAwake: "off",
  bar: "standard",
  platesMetric: DEFAULT_PLATES.metric,
  platesImperial: DEFAULT_PLATES.imperial,
  // Per-exercise plate loading chosen in the workout form, { "leg press": "barbell" }.
  plateLoading: {},
  // Per-exercise rep range for the suggestion, { "lateral raise": "12-15" }; others use repRange.
  exerciseRepRanges: {},
}

// Limits for the per-exercise maps, so a hand-edited entry can't grow localStorage without end.
const MAX_EXERCISE_ENTRIES = 200
const MAX_EXERCISE_KEY = 100

// A per-exercise map with normalised keys, keeping only entries for which keep(key, value) is true.
function sanitizeExerciseMap(value, keep) {
  const result = {}
  if (!value || typeof value !== "object" || Array.isArray(value)) return result
  for (const [name, choice] of Object.entries(value)) {
    const key = exerciseKey(name)
    if (!key || key.length > MAX_EXERCISE_KEY || !keep(key, choice)) continue
    if (Object.keys(result).length >= MAX_EXERCISE_ENTRIES) break
    result[key] = choice
  }
  return result
}

// Keeps only choices that differ from the default by name, under normalised keys.
export function sanitizePlateLoading(value) {
  return sanitizeExerciseMap(value, (key, loading) => LOADINGS.includes(loading) && loading !== defaultLoading(key))
}

// Returns the map with the choice for one exercise set (or removed, when it is the default).
export function withPlateLoading(map, name, loading) {
  return sanitizePlateLoading({ ...map, [exerciseKey(name)]: loading })
}

// Keeps only allowed rep ranges. A range equal to the general one is kept on purpose:
// it was chosen for this exercise and shouldn't move when the general range changes.
export function sanitizeExerciseRepRanges(value) {
  return sanitizeExerciseMap(value, (_key, range) => OPTIONS.repRange.includes(range))
}

// Returns the map with the range for one exercise set; "" (or any unknown value) is dropped by the
// sanitizer, so the exercise follows the general range again.
export function withExerciseRepRange(map, name, range) {
  return sanitizeExerciseRepRanges({ ...map, [exerciseKey(name)]: range })
}

// The rep range that applies to an exercise: its own one, or the general one.
export function repRangeFor(name, map, generalRange) {
  return map?.[exerciseKey(name)] ?? generalRange
}

// Keeps only known keys with allowed values, so a stale or hand-edited
// localStorage entry can never put the UI into an unsupported state.
export function sanitizePreferences(value) {
  const result = { ...DEFAULT_PREFERENCES }
  if (!value || typeof value !== "object") return result
  for (const [key, allowed] of Object.entries(OPTIONS)) {
    if (allowed.includes(value[key])) result[key] = value[key]
  }
  // Lists keep only allowed values, without duplicates, in the canonical order.
  // An empty list is valid (no plates: the calculator only shows the bar).
  for (const [key, allowed] of Object.entries(LIST_OPTIONS)) {
    if (Array.isArray(value[key])) result[key] = allowed.filter((option) => value[key].includes(option))
  }
  result.plateLoading = sanitizePlateLoading(value.plateLoading)
  result.exerciseRepRanges = sanitizeExerciseRepRanges(value.exerciseRepRanges)
  return result
}

// The preference key that holds the plates for a unit system.
export function platesKey(units) {
  return units === "imperial" ? "platesImperial" : "platesMetric"
}

// window.localStorage, or undefined where even reading the property throws
// (some browsers do that when site data is blocked).
export function browserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

// storage: anything with getItem/setItem (window.localStorage in the app).
// Storage can be unavailable (private mode, blocked cookies) or contain
// invalid JSON; both fall back to the defaults instead of crashing the app.
export function loadPreferences(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return sanitizePreferences(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function savePreferences(storage, preferences) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(sanitizePreferences(preferences)))
    return true
  } catch {
    return false
  }
}

// "auto" follows the viewport; an explicit choice always wins.
export function resolveLayout(layout, isNarrowViewport) {
  if (layout === "desktop" || layout === "mobile") return layout
  return isNarrowViewport ? "mobile" : "desktop"
}

// --- units ---
// Weights are always stored in kilograms; imperial only changes what is shown and typed.

export const KG_PER_LB = 0.45359237

export function weightUnit(units) {
  return units === "imperial" ? "lb" : "kg"
}

function round(value, decimals) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

// kg -> number in the display unit, rounded to 0.1.
export function toDisplayWeight(kg, units) {
  const n = Number(kg)
  if (!Number.isFinite(n)) return 0
  return round(units === "imperial" ? n / KG_PER_LB : n, 1)
}

// Number typed in the display unit -> kg for storage. Rounded to 0.01 kg, which
// is precise enough that converting back shows the value that was typed.
export function fromDisplayWeight(value, units) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return round(units === "imperial" ? n * KG_PER_LB : n, 2)
}

// 1234.5 -> "1 234,5 kg" style output, using the browser's number formatting.
export function formatWeight(kg, units, { decimals = 1, locale } = {}) {
  const value = toDisplayWeight(kg, units)
  const text = value.toLocaleString(locale, { maximumFractionDigits: decimals })
  return `${text} ${weightUnit(units)}`
}
