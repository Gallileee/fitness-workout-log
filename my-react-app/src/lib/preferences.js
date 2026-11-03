// src/lib/preferences.js
// User preferences (accent colour, font style, spacing, layout, units, rep range, rest timer, screen on), stored in localStorage
// like the logged-in user. Pure helpers, so they can be tested with `node --test`.

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
  // Keep the screen on while the app is open (src/lib/wakeLock.js).
  keepAwake: ["off", "on"],
}

export const DEFAULT_PREFERENCES = {
  accent: "purple",
  font: "default",
  density: "comfortable",
  layout: "auto",
  units: "metric",
  repRange: "6-10",
  restTimer: "90",
  keepAwake: "off",
}

// Keeps only known keys with allowed values, so a stale or hand-edited
// localStorage entry can never put the UI into an unsupported state.
export function sanitizePreferences(value) {
  const result = { ...DEFAULT_PREFERENCES }
  if (!value || typeof value !== "object") return result
  for (const [key, allowed] of Object.entries(OPTIONS)) {
    if (allowed.includes(value[key])) result[key] = value[key]
  }
  return result
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
