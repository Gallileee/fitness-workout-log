// src/lib/adherence.js
// How well the logged workouts follow the weekly plan. Pure functions, so they
// can be tested with `node --test`. Weeks run Monday to Sunday, in local time.
import { parseLocalDate } from "./stats.js"
import { normalizeWeeklyPlan } from "./weeklyPlan.js"

function addDays(date, days) {
  // Via the calendar, not milliseconds, so daylight saving changes don't shift the day.
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// Monday 00:00 (local) of the week containing `date`.
export function startOfWeek(date) {
  const mondayOffset = (date.getDay() + 6) % 7 // getDay(): 0 = Sunday
  return addDays(date, -mondayOffset)
}

export function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// { "YYYY-MM-DD": ["push", ...] } for workouts with a valid date.
function typesByDate(workouts) {
  const map = new Map()
  for (const w of workouts || []) {
    if (!parseLocalDate(w?.date)) continue
    if (!map.has(w.date)) map.set(w.date, [])
    map.get(w.date).push(w.type)
  }
  return map
}

// One entry per day of the week containing `today`, Monday first.
// status:
//   "done"     planned type was logged that day
//   "other"    a workout was logged, but of a different type
//   "missed"   planned, in the past, nothing logged
//   "today"    planned for today, nothing logged yet
//   "upcoming" planned, later this week
//   "rest"     rest day, nothing logged
//   "extra"    rest day, but a workout was logged
export function currentWeekStatus(plan, workouts, today = new Date()) {
  const days = normalizeWeeklyPlan(plan)
  const byDate = typesByDate(workouts)
  const monday = startOfWeek(today)
  const todayIso = toIsoDate(today)

  return days.map(({ day, type }, i) => {
    const date = toIsoDate(addDays(monday, i))
    const logged = byDate.get(date) ?? []
    let status
    if (type === "off") status = logged.length ? "extra" : "rest"
    else if (logged.includes(type)) status = "done"
    else if (logged.length) status = "other"
    else if (date < todayIso) status = "missed"
    else if (date === todayIso) status = "today"
    else status = "upcoming"
    return { day, date, planned: type, logged, status }
  })
}

// Completion of the plan for the last `weeks` weeks (oldest first, the
// current week last). Days can move within a week: a planned session counts
// as completed when a workout of the same type was logged any day that week.
// So for each type: completed = min(planned sessions, logged workouts).
// Past weeks are measured against the current plan, since older plans aren't stored.
export function weeklyAdherence(plan, workouts, { weeks = 8, today = new Date() } = {}) {
  const plannedByType = countBy(normalizeWeeklyPlan(plan).map((d) => d.type).filter((t) => t !== "off"))
  const planned = sum(plannedByType.values())
  const thisMonday = startOfWeek(today)

  const result = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i)
    const from = toIsoDate(start)
    const to = toIsoDate(addDays(start, 6))
    const loggedByType = countBy(
      (workouts || []).filter((w) => parseLocalDate(w?.date) && w.date >= from && w.date <= to).map((w) => w.type)
    )
    let completed = 0
    for (const [type, count] of plannedByType) completed += Math.min(count, loggedByType.get(type) ?? 0)
    result.push({
      weekStart: from,
      planned,
      completed,
      ratio: planned ? completed / planned : null,
      current: i === 0,
    })
  }
  return result
}

// Consecutive fully completed weeks, counted back from the newest. The current
// week only counts once it is complete; while it is still in progress the
// streak starts from last week, so it doesn't drop to 0 every Monday.
export function completedWeekStreak(weeks) {
  let streak = 0
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i]
    const complete = w.planned > 0 && w.completed >= w.planned
    if (complete) streak++
    else if (w.current) continue
    else break
  }
  return streak
}

function countBy(values) {
  const map = new Map()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return map
}

function sum(values) {
  let total = 0
  for (const v of values) total += v
  return total
}
