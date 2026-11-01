// Run with: npm test  (uses the built-in node:test runner, no extra dependencies)
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
  parseLocalDate,
  filterWorkouts,
  workoutVolume,
  summarize,
  estimateOneRepMax,
  personalRecords,
  oneRepMaxHistory,
} from "./stats.js"
import { scaleSeries } from "./chart.js"

const bench = (sets, reps, weight) => ({ name: "Bench Press (Barbell)", sets, reps, weight })

const workouts = [
  { id: 1, date: "2026-10-20", type: "push", exercises: [bench(3, 10, 60)] }, // 1800
  { id: 2, date: "2026-10-27", type: "pull", exercises: [{ name: "Pull-up", sets: 3, reps: 8, weight: 0 }] },
  { id: 3, date: "2026-10-31", type: "push", exercises: [bench(5, 5, 80), bench(1, 1, 95)] }, // 2000 + 95
  { id: 4, date: null, type: "legs", exercises: [] },
]

describe("parseLocalDate", () => {
  test("parses YYYY-MM-DD as local midnight", () => {
    const d = parseLocalDate("2026-03-14")
    assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 2, 14, 0])
  })

  test("rejects empty, malformed and impossible dates", () => {
    for (const value of [null, undefined, "", "14.3.2026", "2026-3-14", "2026-02-31", "2026-13-01"]) {
      assert.equal(parseLocalDate(value), null, String(value))
    }
  })
})

describe("filterWorkouts", () => {
  const ids = (list) => list.map((w) => w.id)

  test("returns everything with default filters", () => {
    assert.deepEqual(ids(filterWorkouts(workouts, { type: "all", from: "", to: "" })), [1, 2, 3, 4])
    assert.deepEqual(ids(filterWorkouts(workouts, undefined)), [1, 2, 3, 4])
  })

  test("filters by type", () => {
    assert.deepEqual(ids(filterWorkouts(workouts, { type: "push" })), [1, 3])
  })

  test("date bounds are inclusive", () => {
    assert.deepEqual(ids(filterWorkouts(workouts, { from: "2026-10-27", to: "2026-10-31" })), [2, 3])
    assert.deepEqual(ids(filterWorkouts(workouts, { to: "2026-10-20" })), [1])
  })

  test("drops undated workouts only when a date bound is set", () => {
    assert.ok(ids(filterWorkouts(workouts, { type: "legs" })).includes(4))
    assert.deepEqual(ids(filterWorkouts(workouts, { type: "legs", from: "2026-01-01" })), [])
  })

  test("combines type and date filters", () => {
    assert.deepEqual(ids(filterWorkouts(workouts, { type: "push", from: "2026-10-25" })), [3])
  })
})

describe("workoutVolume", () => {
  test("sums sets × reps × weight", () => {
    assert.equal(workoutVolume(workouts[2]), 5 * 5 * 80 + 95)
  })

  test("treats missing, negative and non-numeric values as 0", () => {
    const w = { exercises: [{ sets: "3", reps: "10", weight: "50" }, { sets: 3, reps: -5, weight: 100 }, { sets: 2 }] }
    assert.equal(workoutVolume(w), 1500)
    assert.equal(workoutVolume({}), 0)
    assert.equal(workoutVolume(undefined), 0)
  })
})

describe("summarize", () => {
  const today = new Date(2026, 9, 31, 0, 30) // 31 Oct 2026, 00:30 local time

  test("computes totals and the average", () => {
    const s = summarize(workouts, today)
    assert.equal(s.totalWorkouts, 4)
    assert.equal(s.totalVolume, 1800 + 2095)
    assert.equal(s.avgVolumePerWorkout, Math.round(3895 / 4))
  })

  test("last 7 days include today even just after midnight", () => {
    // Window is 25–31 Oct: workout 3 (today) counts, workout 1 (20 Oct) doesn't.
    assert.equal(summarize(workouts, today).volumeLast7Days, 2095)
  })

  test("the window starts 6 days before today", () => {
    const s = summarize([{ date: "2026-10-25", exercises: [bench(1, 1, 100)] }, { date: "2026-10-24", exercises: [bench(1, 1, 100)] }], today)
    assert.equal(s.volumeLast7Days, 100)
  })

  test("handles an empty or missing list", () => {
    assert.deepEqual(summarize([], today), { totalWorkouts: 0, totalVolume: 0, volumeLast7Days: 0, avgVolumePerWorkout: 0 })
    assert.equal(summarize(null, today).totalWorkouts, 0)
  })
})

describe("estimateOneRepMax", () => {
  test("uses the Epley formula", () => {
    assert.equal(estimateOneRepMax(100, 5), 116.7) // 100 × (1 + 5/30)
    assert.equal(estimateOneRepMax(60, 10), 80)
  })

  test("a single rep is the weight itself", () => {
    assert.equal(estimateOneRepMax(95, 1), 95)
  })

  test("returns null for unreliable or invalid sets", () => {
    assert.equal(estimateOneRepMax(60, 11), null)
    assert.equal(estimateOneRepMax(0, 5), null)
    assert.equal(estimateOneRepMax(60, 0), null)
    assert.equal(estimateOneRepMax(60, 2.5), null)
    assert.equal(estimateOneRepMax("abc", 5), null)
  })
})

describe("personalRecords", () => {
  test("finds the heaviest weight and best estimated 1RM per exercise", () => {
    const records = personalRecords(workouts)
    assert.deepEqual(records, [
      {
        name: "Bench Press (Barbell)",
        bestWeight: 95,
        bestWeightDate: "2026-10-31",
        bestE1rm: 95, // 1×95 kg (95) beats 5×80 kg (93.3) and 10×60 kg (80)
        bestE1rmDate: "2026-10-31",
      },
    ])
  })

  test("skips bodyweight exercises and merges names case-insensitively", () => {
    const records = personalRecords([
      { date: "2026-01-01", exercises: [{ name: "Squat", sets: 3, reps: 12, weight: 100 }] },
      { date: "2026-01-08", exercises: [{ name: " squat ", sets: 3, reps: 5, weight: 90 }, { name: "Dips", reps: 10, weight: 0 }] },
    ])
    assert.equal(records.length, 1)
    assert.equal(records[0].name, "Squat")
    assert.equal(records[0].bestWeight, 100)
    assert.equal(records[0].bestWeightDate, "2026-01-01")
    // 12 reps is above the 1RM rep limit, so only the 5-rep set counts.
    assert.equal(records[0].bestE1rm, 105)
    assert.equal(records[0].bestE1rmDate, "2026-01-08")
  })

  test("returns an empty list when there is nothing to report", () => {
    assert.deepEqual(personalRecords([]), [])
    assert.deepEqual(personalRecords(undefined), [])
  })
})

describe("oneRepMaxHistory", () => {
  test("returns the best estimate per day, oldest first", () => {
    // Workouts arrive newest first from Supabase; the 95 kg single beats 80×5 (93.3).
    assert.deepEqual(oneRepMaxHistory([...workouts].reverse(), "Bench Press (Barbell)"), [
      { date: "2026-10-20", e1rm: 80 },
      { date: "2026-10-31", e1rm: 95 },
    ])
  })

  test("merges two workouts on the same day and matches names case-insensitively", () => {
    const sameDay = [
      { date: "2026-11-01", exercises: [{ name: "squat", sets: 3, reps: 5, weight: 100 }] },
      { date: "2026-11-01", exercises: [{ name: " Squat ", sets: 1, reps: 3, weight: 110 }] },
    ]
    assert.deepEqual(oneRepMaxHistory(sameDay, "SQUAT"), [{ date: "2026-11-01", e1rm: 121 }])
  })

  test("skips undated workouts, unknown exercises and sets that give no estimate", () => {
    const list = [
      { date: null, exercises: [bench(1, 1, 100)] },
      { date: "2026-10-01", exercises: [bench(3, 15, 50), bench(3, 8, 0)] },
    ]
    assert.deepEqual(oneRepMaxHistory(list, "Bench Press (Barbell)"), [])
    assert.deepEqual(oneRepMaxHistory(workouts, "Deadlift"), [])
    assert.deepEqual(oneRepMaxHistory(workouts, ""), [])
  })
})

describe("scaleSeries", () => {
  const box = { width: 100, height: 50, padding: 10 }

  test("spreads points across the width and puts the maximum at the top", () => {
    const { points, min, max } = scaleSeries([80, 90, 100], box)
    assert.equal(min, 80)
    assert.equal(max, 100)
    assert.deepEqual(points, [
      { x: 10, y: 40 },
      { x: 50, y: 25 },
      { x: 90, y: 10 },
    ])
  })

  test("draws a flat series and a single point through the middle", () => {
    assert.deepEqual(scaleSeries([70, 70], box).points, [
      { x: 10, y: 25 },
      { x: 90, y: 25 },
    ])
    assert.deepEqual(scaleSeries([70], box).points, [{ x: 50, y: 25 }])
  })

  test("returns no points for empty or non-numeric input", () => {
    assert.deepEqual(scaleSeries([], box), { points: [], min: null, max: null })
    assert.deepEqual(scaleSeries([NaN, undefined], box), { points: [], min: null, max: null })
  })
})
