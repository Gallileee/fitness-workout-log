import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { DAY_NAMES, createDefaultWeeklyPlan, normalizeWeeklyPlan, planToDays } from "./weeklyPlan.js"
import { TABLE, loadWeeklyPlan, saveWeeklyPlan, createLatestSaver } from "./weeklyPlanStore.js"
import { supabase as demoClient } from "../demo/demoSupabaseClient.js"

const DEFAULT_DAYS = ["push", "pull", "legs", "off", "push", "pull", "off"]
const CUSTOM_DAYS = ["fullbody", "off", "fullbody", "off", "core", "legs", "off"]

describe("normalizeWeeklyPlan", () => {
  test("turns stored types into the UI shape, Monday first", () => {
    const plan = normalizeWeeklyPlan(CUSTOM_DAYS)
    assert.deepEqual(
      plan.map((d) => d.day),
      DAY_NAMES
    )
    assert.deepEqual(
      plan.map((d) => d.type),
      CUSTOM_DAYS
    )
  })

  test("accepts a plan already in the UI shape", () => {
    const plan = createDefaultWeeklyPlan()
    plan[3] = { day: "anything", type: "core" }
    assert.equal(normalizeWeeklyPlan(plan)[3].type, "core")
    assert.equal(normalizeWeeklyPlan(plan)[3].day, "Čtvrtek")
  })

  test("falls back to the default for unknown types, missing days and non-arrays", () => {
    const plan = normalizeWeeklyPlan(["push", "yoga", null, 42])
    assert.deepEqual(
      plan.map((d) => d.type),
      ["push", "pull", "legs", "off", "push", "pull", "off"]
    )
    for (const bad of [null, undefined, "push", { 0: "legs" }]) {
      assert.deepEqual(normalizeWeeklyPlan(bad), createDefaultWeeklyPlan())
    }
  })

  test("ignores extra days", () => {
    assert.equal(normalizeWeeklyPlan([...CUSTOM_DAYS, "push"]).length, 7)
  })
})

describe("planToDays", () => {
  test("stores only the seven types", () => {
    assert.deepEqual(planToDays(createDefaultWeeklyPlan()), DEFAULT_DAYS)
    assert.deepEqual(planToDays(normalizeWeeklyPlan(CUSTOM_DAYS)), CUSTOM_DAYS)
  })
})

// Records the calls the store makes and answers with `response`.
function fakeClient(response = { data: null, error: null }) {
  const calls = []
  const builder = {}
  for (const method of ["select", "eq", "maybeSingle", "upsert"]) {
    builder[method] = (...args) => {
      calls.push([method, ...args])
      return builder
    }
  }
  builder.then = (resolve, reject) => Promise.resolve(response).then(resolve, reject)
  return {
    calls,
    from(table) {
      calls.push(["from", table])
      return builder
    },
  }
}

describe("loadWeeklyPlan", () => {
  test("reads the user's row from weekly_plans", async () => {
    const client = fakeClient({ data: { days: CUSTOM_DAYS }, error: null })
    const plan = await loadWeeklyPlan(client, "user-1")
    assert.deepEqual(planToDays(plan), CUSTOM_DAYS)
    assert.deepEqual(client.calls, [
      ["from", TABLE],
      ["select", "days"],
      ["eq", "user_id", "user-1"],
      ["maybeSingle"],
    ])
  })

  test("returns the default plan when the user has no row yet", async () => {
    const plan = await loadWeeklyPlan(fakeClient({ data: null, error: null }), "user-1")
    assert.deepEqual(plan, createDefaultWeeklyPlan())
  })

  test("throws database errors", async () => {
    const error = { message: 'relation "public.weekly_plans" does not exist' }
    await assert.rejects(loadWeeklyPlan(fakeClient({ data: null, error }), "user-1"), (e) => e === error)
  })
})

describe("saveWeeklyPlan", () => {
  test("upserts user_id, the seven types and a timestamp", async () => {
    const client = fakeClient()
    await saveWeeklyPlan(client, "user-1", normalizeWeeklyPlan(CUSTOM_DAYS))
    assert.deepEqual(client.calls[0], ["from", TABLE])
    const [method, row, options] = client.calls[1]
    assert.equal(method, "upsert")
    assert.equal(row.user_id, "user-1")
    assert.deepEqual(row.days, CUSTOM_DAYS)
    assert.ok(!Number.isNaN(Date.parse(row.updated_at)))
    assert.deepEqual(options, { onConflict: "user_id" })
  })

  test("throws database errors", async () => {
    const error = { message: "new row violates row-level security policy" }
    await assert.rejects(saveWeeklyPlan(fakeClient({ data: null, error }), "u", createDefaultWeeklyPlan()))
  })
})

// A save whose completion the test controls.
function deferredSave() {
  const started = []
  const save = (value) =>
    new Promise((resolve, reject) => {
      started.push({ value, resolve, reject })
    })
  return { started, save }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("createLatestSaver", () => {
  test("saves one value and reports saving, then saved", async () => {
    const statuses = []
    const request = createLatestSaver(async () => {}, (s) => statuses.push(s))
    await request("a")
    assert.deepEqual(statuses, ["saving", "saved"])
  })

  test("runs one save at a time and skips values replaced while waiting", async () => {
    const { started, save } = deferredSave()
    const statuses = []
    const request = createLatestSaver(save, (s) => statuses.push(s))

    const done = request("a")
    request("b")
    request("c") // replaces "b" before it was sent
    await tick()
    assert.deepEqual(
      started.map((s) => s.value),
      ["a"]
    )

    started[0].resolve()
    await tick()
    assert.deepEqual(
      started.map((s) => s.value),
      ["a", "c"]
    )
    assert.deepEqual(statuses, ["saving", "saving"], "no 'saved' while a newer value is waiting")

    started[1].resolve()
    await done
    assert.deepEqual(statuses, ["saving", "saving", "saved"])
  })

  test("reports an error with the error object and keeps working afterwards", async () => {
    const statuses = []
    let fail = true
    const request = createLatestSaver(
      async () => {
        if (fail) throw new Error("offline")
      },
      (s, e) => statuses.push(e ? `${s}: ${e.message}` : s)
    )
    await request("a")
    fail = false
    await request("b")
    assert.deepEqual(statuses, ["saving", "error: offline", "saving", "saved"])
  })

  test("an older failure is not reported when a newer value is waiting", async () => {
    const { started, save } = deferredSave()
    const statuses = []
    const request = createLatestSaver(save, (s) => statuses.push(s))
    const done = request("a")
    request("b")
    started[0].reject(new Error("timeout"))
    await tick()
    started[1].resolve()
    await done
    assert.deepEqual(statuses, ["saving", "saving", "saved"])
  })
})

describe("demo client (npm run demo)", () => {
  test("a new account has no plan, and a saved plan is loaded back", async () => {
    const userId = "demo-test-user"
    assert.deepEqual(await loadWeeklyPlan(demoClient, userId), createDefaultWeeklyPlan())

    await saveWeeklyPlan(demoClient, userId, normalizeWeeklyPlan(CUSTOM_DAYS))
    assert.deepEqual(planToDays(await loadWeeklyPlan(demoClient, userId)), CUSTOM_DAYS)

    // The second save updates the same row instead of adding one.
    await saveWeeklyPlan(demoClient, userId, createDefaultWeeklyPlan())
    const { data } = await demoClient.from(TABLE).select("days").eq("user_id", userId)
    assert.equal(data.length, 1)
    assert.deepEqual(data[0].days, DEFAULT_DAYS)
  })

  test("plans are kept per user", async () => {
    await saveWeeklyPlan(demoClient, "demo-a", normalizeWeeklyPlan(CUSTOM_DAYS))
    assert.deepEqual(await loadWeeklyPlan(demoClient, "demo-b"), createDefaultWeeklyPlan())
  })
})
