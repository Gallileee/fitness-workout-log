import { describe, test, expect } from "vitest"
import { lastPerformance, stepNumber } from "./history.js"

const ex = (name, sets, reps, weight) => ({ name, sets, reps, weight })
const w = (date, exercises, id = date) => ({ id, date, type: "push", exercises })

const WORKOUTS = [
  w("2026-10-30", [ex("Squat (Barbell Back)", 4, 5, 100)]),
  w("2026-10-27", [ex("Bench Press (Barbell)", 3, 8, 80), ex("bench press (barbell)", 1, 5, 85)]),
  w("2026-10-20", [ex("Bench Press (Barbell)", 3, 8, 77.5)]),
  w("2026-11-31", [ex("Bench Press (Barbell)", 3, 8, 200)]), // invalid date
]

describe("lastPerformance", () => {
  test("returns every entry of the exercise from its most recent workout", () => {
    expect(lastPerformance(WORKOUTS, "Bench Press (Barbell)")).toEqual({
      date: "2026-10-27",
      entries: [
        { sets: 3, reps: 8, weight: 80 },
        { sets: 1, reps: 5, weight: 85 },
      ],
    })
  })

  test("matches names case-insensitively and ignores surrounding spaces", () => {
    expect(lastPerformance(WORKOUTS, "  BENCH press (barbell) ")?.date).toBe("2026-10-27")
  })

  test("finds the newest workout even when the list isn't sorted", () => {
    expect(lastPerformance([...WORKOUTS].reverse(), "Bench Press (Barbell)")?.date).toBe("2026-10-27")
  })

  test("onOrBefore skips later workouts but keeps the same day", () => {
    expect(lastPerformance(WORKOUTS, "Bench Press (Barbell)", { onOrBefore: "2026-10-26" })?.entries).toEqual([
      { sets: 3, reps: 8, weight: 77.5 },
    ])
    expect(lastPerformance(WORKOUTS, "Bench Press (Barbell)", { onOrBefore: "2026-10-27" })?.date).toBe("2026-10-27")
    expect(lastPerformance(WORKOUTS, "Bench Press (Barbell)", { onOrBefore: "" })?.date).toBe("2026-10-27")
  })

  test("returns null for unknown or empty names and when nothing is old enough", () => {
    expect(lastPerformance(WORKOUTS, "Deadlift")).toBeNull()
    expect(lastPerformance(WORKOUTS, "")).toBeNull()
    expect(lastPerformance(WORKOUTS, "Bench Press (Barbell)", { onOrBefore: "2026-01-01" })).toBeNull()
    expect(lastPerformance(null, "Bench Press (Barbell)")).toBeNull()
  })

  test("of two workouts on the same day, the first in the list wins", () => {
    const sameDay = [
      w("2026-11-01", [ex("Curl", 3, 12, 12)], "evening"),
      w("2026-11-01", [ex("Curl", 3, 10, 14)], "morning"),
    ]
    expect(lastPerformance(sameDay, "Curl")?.entries[0].weight).toBe(12)
  })

  test("non-numeric values become 0", () => {
    expect(lastPerformance([w("2026-11-01", [ex("Pull-up", "3", "x", null)])], "Pull-up")?.entries).toEqual([
      { sets: 3, reps: 0, weight: 0 },
    ])
  })
})

describe("stepNumber", () => {
  test("adds and subtracts", () => {
    expect(stepNumber(3, 1, { min: 1 })).toBe(4)
    expect(stepNumber("80", 2.5)).toBe(82.5)
    expect(stepNumber("80", -2.5)).toBe(77.5)
  })

  test("never goes below min", () => {
    expect(stepNumber(1, -1, { min: 1 })).toBe(1)
    expect(stepNumber(1, -2.5)).toBe(0)
  })

  test("an empty or invalid value starts from min", () => {
    expect(stepNumber("", 1, { min: 1 })).toBe(2)
    expect(stepNumber("abc", 2.5)).toBe(2.5)
  })

  test("doesn't accumulate floating point errors", () => {
    let value = 0
    for (let i = 0; i < 33; i++) value = stepNumber(value, 0.1)
    expect(value).toBe(3.3)
  })
})
