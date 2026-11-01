// src/lib/format.js
import { parseLocalDate } from "./stats.js"

// "2026-10-26" -> "po 26. 10." (Czech short weekday, day and month).
// Falls back to the raw value when it isn't a valid date.
export function formatWorkoutDate(value, { withYear = false } = {}) {
  const date = parseLocalDate(value)
  if (!date) return value || "Bez data"
  return date.toLocaleDateString("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  })
}
