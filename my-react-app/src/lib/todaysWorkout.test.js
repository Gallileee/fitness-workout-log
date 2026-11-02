import { describe, test, expect } from "vitest"
import { plannedTypeFor, todaysWorkout } from "./todaysWorkout.js"
import { createDefaultWeeklyPlan } from "./weeklyPlan.js"

// Default plan: Mon push, Tue pull, Wed legs, Thu off, Fri push, Sat pull, Sun off.
const PLAN = createDefaultWeeklyPlan()
const MONDAY = new Date(2026, 10, 2, 7, 30)
const THURSDAY = new Date(2026, 10, 5, 18)

const ex = (name) => ({ name, sets: 3, reps: 8, weight: 50 })
const w = (date, type, names) => ({ id: `${date}-${type}`, date, type, exercises: names.map(ex) })

describe("plannedTypeFor", () => {
  test("maps the weekday to the plan, Monday first", () => {
    expect(plannedTypeFor(PLAN, MONDAY)).toBe("push")
    expect(plannedTypeFor(PLAN, new Date(2026, 10, 3))).toBe("pull")
    expect(plannedTypeFor(PLAN, THURSDAY)).toBe("off")
    expect(plannedTypeFor(PLAN, new Date(2026, 10, 8, 23, 59))).toBe("off") // Sunday
  })

  test("falls back to the default plan for a missing plan", () => {
    expect(plannedTypeFor(null, MONDAY)).toBe("push")
  })
})

describe("todaysWorkout", () => {
  const workouts = [
    w("2026-10-30", "push", ["Bench Press (Barbell)", "Overhead Press (Barbell)", "bench press (barbell)", "Dips"]),
    w("2026-10-26", "push", ["Incline Bench Press (Dumbbell)"]),
    w("2026-10-31", "pull", ["Deadlift (Conventional)"]),
  ]

  test("takes the exercises from the newest earlier workout of today's type", () => {
    expect(todaysWorkout(PLAN, workouts, MONDAY)).toEqual({
      date: "2026-11-02",
      type: "push",
      done: false,
      exerciseNames: ["Bench Press (Barbell)", "Overhead Press (Barbell)", "Dips"],
      sourceDate: "2026-10-30",
    })
  })

  test("is done when a workout of the planned type is already logged today", () => {
    const today = [...workouts, w("2026-11-02", "push", ["Dips"])]
    const result = todaysWorkout(PLAN, today, MONDAY)
    expect(result.done).toBe(true)
    // Today's own workout is never the template.
    expect(result.sourceDate).toBe("2026-10-30")
  })

  test("a workout of another type today doesn't count as done", () => {
    expect(todaysWorkout(PLAN, [...workouts, w("2026-11-02", "core", ["Plank"])], MONDAY).done).toBe(false)
  })

  test("a rest day has no exercises", () => {
    expect(todaysWorkout(PLAN, workouts, THURSDAY)).toMatchObject({ type: "off", exerciseNames: [], sourceDate: null })
  })

  test("without an earlier workout of that type there are no exercises yet", () => {
    expect(todaysWorkout(PLAN, workouts, new Date(2026, 10, 4))).toMatchObject({
      type: "legs",
      exerciseNames: [],
      sourceDate: null,
    })
  })

  test("ignores later workouts and invalid dates", () => {
    const odd = [w("2026-11-09", "push", ["Future"]), w("2026-02-31", "push", ["Invalid"]), ...workouts]
    expect(todaysWorkout(PLAN, odd, MONDAY).sourceDate).toBe("2026-10-30")
  })
})
