import { test, describe } from "vitest"
import assert from "node:assert/strict"
import { historyFromRows, planForWeek } from "./planHistory.js"
import { createDefaultWeeklyPlan, normalizeWeeklyPlan, planToDays } from "./weeklyPlan.js"
import {
  TABLE,
  HISTORY_TABLE,
  historyWeekOf,
  loadPlanHistory,
  saveWeeklyPlan,
} from "./weeklyPlanStore.js"
import { supabase as demoClient } from "../demo/demoSupabaseClient.js"

const THREE_DAYS = ["push", "pull", "legs", "off", "off", "off", "off"]
const FULL_BODY = ["fullbody", "off", "fullbody", "off", "fullbody", "off", "off"]
const plan = (days) => normalizeWeeklyPlan(days)
const daysOf = (history) => history.map((e) => [e.weekStart, planToDays(e.plan)])

describe("historyFromRows", () => {
  test("sorts by week, oldest first, and normalizes the days", () => {
    const history = historyFromRows([
      { week_start: "2026-11-09", days: FULL_BODY },
      { week_start: "2026-10-12", days: THREE_DAYS },
    ])
    assert.deepEqual(daysOf(history), [
      ["2026-10-12", THREE_DAYS],
      ["2026-11-09", FULL_BODY],
    ])
  })

  test("drops rows with a bad date, repairs bad days, copes with no rows", () => {
    const history = historyFromRows([
      { week_start: "2026-02-30", days: THREE_DAYS },
      { week_start: null, days: THREE_DAYS },
      { week_start: "2026-11-02", days: "nonsense" },
      null,
    ])
    assert.deepEqual(daysOf(history), [["2026-11-02", planToDays(createDefaultWeeklyPlan())]])
    assert.deepEqual(historyFromRows(null), [])
  })
})

describe("planForWeek", () => {
  const current = plan(FULL_BODY)
  const history = historyFromRows([
    { week_start: "2026-10-12", days: THREE_DAYS },
    { week_start: "2026-11-02", days: createDefaultWeeklyPlan() },
  ])
  const typesFor = (week) => planToDays(planForWeek(history, week, current))

  test("uses the newest plan saved in that week or before", () => {
    assert.deepEqual(typesFor("2026-10-12"), THREE_DAYS, "the week it was saved in")
    assert.deepEqual(typesFor("2026-10-26"), THREE_DAYS, "a later week without a change")
    assert.deepEqual(typesFor("2026-11-02"), planToDays(createDefaultWeeklyPlan()))
    assert.deepEqual(typesFor("2026-11-16"), planToDays(createDefaultWeeklyPlan()))
  })

  test("weeks before the first entry use the oldest plan; no history uses the fallback", () => {
    assert.deepEqual(typesFor("2026-09-28"), THREE_DAYS)
    assert.equal(planForWeek([], "2026-11-02", current), current)
    assert.equal(planForWeek(undefined, "2026-11-02", current), current)
  })
})

// A fake Supabase client that records calls and answers per table.
function fakeClient(responses = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const builder = {}
      for (const method of ["select", "eq", "order", "upsert", "maybeSingle"]) {
        builder[method] = (...args) => {
          calls.push([table, method, ...args])
          return builder
        }
      }
      builder.then = (resolve, reject) =>
        Promise.resolve(responses[table] ?? { data: null, error: null }).then(resolve, reject)
      return builder
    },
  }
}

describe("historyWeekOf", () => {
  test("files a save under the Monday of its local week", () => {
    assert.equal(historyWeekOf(new Date(2026, 10, 4, 12)), "2026-11-02")
    assert.equal(historyWeekOf(new Date(2026, 10, 8, 23, 59)), "2026-11-02", "late Sunday")
    assert.equal(historyWeekOf(new Date(2026, 10, 9, 0, 1)), "2026-11-09", "just after midnight on Monday")
  })
})

describe("saveWeeklyPlan with history", () => {
  const WEDNESDAY = new Date(2026, 10, 4, 12)

  test("saves the plan, then this week's history row with the same days and time", async () => {
    const client = fakeClient()
    await saveWeeklyPlan(client, "user-1", plan(FULL_BODY), { now: WEDNESDAY })
    const upserts = client.calls.filter((c) => c[1] === "upsert")
    assert.deepEqual(
      upserts.map((c) => c[0]),
      [TABLE, HISTORY_TABLE]
    )
    const [, , row, options] = upserts[1]
    assert.deepEqual(row, {
      user_id: "user-1",
      week_start: "2026-11-02",
      days: FULL_BODY,
      updated_at: WEDNESDAY.toISOString(),
    })
    assert.deepEqual(options, { onConflict: "user_id,week_start" })
    assert.equal(upserts[0][2].updated_at, WEDNESDAY.toISOString())
  })

  test("a failed history write doesn't fail the save; it is reported", async () => {
    const error = { message: 'relation "public.weekly_plan_history" does not exist' }
    const reported = []
    const client = fakeClient({ [HISTORY_TABLE]: { data: null, error } })
    await saveWeeklyPlan(client, "user-1", plan(FULL_BODY), { onHistoryError: (e) => reported.push(e) })
    assert.deepEqual(reported, [error])
  })

  test("a failed plan write throws before the history is touched", async () => {
    const error = { message: "permission denied" }
    const client = fakeClient({ [TABLE]: { data: null, error } })
    await assert.rejects(saveWeeklyPlan(client, "user-1", plan(FULL_BODY)), (e) => e === error)
    assert.ok(!client.calls.some((c) => c[0] === HISTORY_TABLE))
  })
})

describe("loadPlanHistory", () => {
  test("reads the user's rows ordered by week", async () => {
    const client = fakeClient({
      [HISTORY_TABLE]: { data: [{ week_start: "2026-11-02", days: THREE_DAYS }], error: null },
    })
    const history = await loadPlanHistory(client, "user-1")
    assert.deepEqual(daysOf(history), [["2026-11-02", THREE_DAYS]])
    assert.deepEqual(client.calls, [
      [HISTORY_TABLE, "select", "week_start, days"],
      [HISTORY_TABLE, "eq", "user_id", "user-1"],
      [HISTORY_TABLE, "order", "week_start", { ascending: true }],
    ])
  })

  test("throws database errors", async () => {
    const error = { message: "permission denied" }
    const client = fakeClient({ [HISTORY_TABLE]: { data: null, error } })
    await assert.rejects(loadPlanHistory(client, "user-1"), (e) => e === error)
  })

  test("round trip through the demo client: one row per week, per user", async () => {
    const monday = new Date(2026, 0, 5, 9)
    await saveWeeklyPlan(demoClient, "history-a", plan(THREE_DAYS), { now: monday })
    await saveWeeklyPlan(demoClient, "history-a", plan(FULL_BODY), { now: new Date(2026, 0, 9, 9) }) // same week
    await saveWeeklyPlan(demoClient, "history-a", plan(THREE_DAYS), { now: new Date(2026, 0, 12, 9) })
    assert.deepEqual(daysOf(await loadPlanHistory(demoClient, "history-a")), [
      ["2026-01-05", FULL_BODY],
      ["2026-01-12", THREE_DAYS],
    ])
    assert.deepEqual(await loadPlanHistory(demoClient, "history-b"), [])
  })
})
