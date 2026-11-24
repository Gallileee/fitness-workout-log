import { test, describe } from "vitest"
import assert from "node:assert/strict"
import process from "node:process"
import { startOfWeek, toIsoDate, currentWeekStatus, weeklyAdherence, completedWeekStreak } from "./adherence.js"
import { createDefaultWeeklyPlan } from "./weeklyPlan.js"
import { historyFromRows } from "./planHistory.js"

// Default plan: Mon push, Tue pull, Wed legs, Thu off, Fri push, Sat pull, Sun off (5 sessions).
const PLAN = createDefaultWeeklyPlan()
// Wednesday 4 November 2026, midday; its week runs Mon 2 Nov – Sun 8 Nov.
const WEDNESDAY = new Date(2026, 10, 4, 12)

const w = (date, type) => ({ date, type, exercises: [] })

describe("startOfWeek / toIsoDate", () => {
  test("weeks start on Monday", () => {
    assert.equal(toIsoDate(startOfWeek(WEDNESDAY)), "2026-11-02")
    assert.equal(toIsoDate(startOfWeek(new Date(2026, 10, 2, 0, 0))), "2026-11-02", "Monday itself")
    assert.equal(toIsoDate(startOfWeek(new Date(2026, 10, 8, 23, 59))), "2026-11-02", "Sunday belongs to the week before")
  })

  test("works across month and year boundaries", () => {
    assert.equal(toIsoDate(startOfWeek(new Date(2027, 0, 1))), "2026-12-28")
  })

  test("is not shifted by daylight saving changes", () => {
    const original = process.env.TZ
    process.env.TZ = "Europe/Prague"
    try {
      // Clocks change on Sunday 29 March and Sunday 25 October 2026.
      assert.equal(toIsoDate(startOfWeek(new Date(2026, 2, 29, 12))), "2026-03-23")
      assert.equal(toIsoDate(startOfWeek(new Date(2026, 2, 30, 0, 30))), "2026-03-30")
      assert.equal(toIsoDate(startOfWeek(new Date(2026, 9, 25, 23))), "2026-10-19")
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })
})

describe("currentWeekStatus", () => {
  test("marks each day of the current week", () => {
    const workouts = [
      w("2026-11-02", "push"), // Mon: planned push → done
      w("2026-11-03", "legs"), // Tue: planned pull, did legs → other
      w("2026-10-30", "push"), // previous week, ignored
    ]
    const week = currentWeekStatus(PLAN, workouts, WEDNESDAY)
    assert.deepEqual(
      week.map((d) => [d.date, d.planned, d.status]),
      [
        ["2026-11-02", "push", "done"],
        ["2026-11-03", "pull", "other"],
        ["2026-11-04", "legs", "today"],
        ["2026-11-05", "off", "rest"],
        ["2026-11-06", "push", "upcoming"],
        ["2026-11-07", "pull", "upcoming"],
        ["2026-11-08", "off", "rest"],
      ]
    )
    assert.deepEqual(week[1].logged, ["legs"])
  })

  test("past planned days without a workout are missed; workouts on rest days are extra", () => {
    const friday = new Date(2026, 10, 6, 9)
    const week = currentWeekStatus(PLAN, [w("2026-11-05", "core")], friday)
    assert.deepEqual(
      week.slice(0, 5).map((d) => d.status),
      ["missed", "missed", "missed", "extra", "today"]
    )
  })

  test("the planned workout counts as done even when there is another one that day", () => {
    const week = currentWeekStatus(PLAN, [w("2026-11-02", "core"), w("2026-11-02", "push")], WEDNESDAY)
    assert.equal(week[0].status, "done")
  })

  test("ignores workouts with invalid dates and copes with a missing plan", () => {
    const week = currentWeekStatus(null, [w("2026-11-31", "push"), w(null, "push")], WEDNESDAY)
    assert.equal(week.length, 7)
    assert.equal(week[0].status, "missed")
  })
})

describe("weeklyAdherence", () => {
  test("returns the requested number of weeks, oldest first, current week last", () => {
    const weeks = weeklyAdherence(PLAN, [], { weeks: 3, today: WEDNESDAY })
    assert.deepEqual(
      weeks.map((x) => [x.weekStart, x.current]),
      [
        ["2026-10-19", false],
        ["2026-10-26", false],
        ["2026-11-02", true],
      ]
    )
    assert.ok(weeks.every((x) => x.planned === 5 && x.completed === 0 && x.ratio === 0))
  })

  test("counts sessions by type, wherever they fall in the week", () => {
    const workouts = [
      // Week of 26 Oct: push, push, pull, pull, legs, all on shifted days → 5/5.
      w("2026-10-26", "pull"),
      w("2026-10-27", "push"),
      w("2026-10-28", "push"),
      w("2026-10-29", "legs"),
      w("2026-11-01", "pull"), // Sunday still belongs to that week
      // Week of 19 Oct: three legs days and a core day → only 1 legs session counts.
      w("2026-10-19", "legs"),
      w("2026-10-21", "legs"),
      w("2026-10-23", "legs"),
      w("2026-10-24", "core"),
    ]
    const [oct19, oct26, nov2] = weeklyAdherence(PLAN, workouts, { weeks: 3, today: WEDNESDAY })
    assert.equal(oct19.completed, 1)
    assert.equal(oct19.ratio, 0.2)
    assert.equal(oct26.completed, 5)
    assert.equal(oct26.ratio, 1)
    assert.equal(nov2.completed, 0)
  })

  test("a plan with only rest days has no ratio", () => {
    const restWeek = PLAN.map((d) => ({ ...d, type: "off" }))
    const [week] = weeklyAdherence(restWeek, [w("2026-11-02", "push")], { weeks: 1, today: WEDNESDAY })
    assert.equal(week.planned, 0)
    assert.equal(week.ratio, null)
  })
})

describe("completedWeekStreak", () => {
  const week = (completed, current = false) => ({ planned: 5, completed, current })

  test("counts complete weeks back from the newest", () => {
    assert.equal(completedWeekStreak([week(5), week(3), week(5), week(5), week(5, true)]), 3)
  })

  test("an unfinished current week doesn't break the streak", () => {
    assert.equal(completedWeekStreak([week(5), week(5), week(1, true)]), 2)
  })

  test("a finished current week extends it", () => {
    assert.equal(completedWeekStreak([week(5), week(5), week(5, true)]), 3)
  })

  test("is 0 when last week was incomplete, or nothing is planned", () => {
    assert.equal(completedWeekStreak([week(5), week(4), week(0, true)]), 0)
    assert.equal(completedWeekStreak([{ planned: 0, completed: 0, current: true }]), 0)
    assert.equal(completedWeekStreak([]), 0)
  })
})

describe("weeklyAdherence with plan history", () => {
  const THREE_DAYS = ["push", "pull", "legs", "off", "off", "off", "off"]
  const REST = ["off", "off", "off", "off", "off", "off", "off"]
  // Three days a week from 12 Oct, a rest week from 19 Oct, the five-day plan from 26 Oct.
  const history = historyFromRows([
    { week_start: "2026-10-12", days: THREE_DAYS },
    { week_start: "2026-10-19", days: REST },
    { week_start: "2026-10-26", days: PLAN },
  ])
  const pplWeek = (monday) => ["push", "pull", "legs"].map((type) => w(monday, type))

  test("measures each past week by the plan that applied then", () => {
    const workouts = [...pplWeek("2026-10-05"), ...pplWeek("2026-10-12"), ...pplWeek("2026-10-26")]
    const weeks = weeklyAdherence(PLAN, workouts, { weeks: 5, today: WEDNESDAY, history })
    assert.deepEqual(
      weeks.map((x) => [x.weekStart, x.completed, x.planned]),
      [
        ["2026-10-05", 3, 3], // before the first entry: the oldest plan
        ["2026-10-12", 3, 3],
        ["2026-10-19", 0, 0],
        ["2026-10-26", 3, 5],
        ["2026-11-02", 0, 5],
      ]
    )
    assert.equal(weeks[2].ratio, null)
  })

  test("the current week always uses the current plan", () => {
    const thisWeek = historyFromRows([{ week_start: "2026-11-02", days: THREE_DAYS }])
    const [week] = weeklyAdherence(PLAN, [], { weeks: 1, today: WEDNESDAY, history: thisWeek })
    assert.equal(week.planned, 5)
  })

  test("a rest week in the history neither counts nor breaks the streak", () => {
    const workouts = [...pplWeek("2026-10-05"), ...pplWeek("2026-10-12")]
    const weeks = weeklyAdherence(PLAN, workouts, { weeks: 4, today: new Date(2026, 9, 28, 12), history })
    // 5 Oct 3/3, 12 Oct 3/3, 19 Oct rest, 26 Oct (current, 0/5).
    assert.equal(completedWeekStreak(weeks), 2)
  })
})
