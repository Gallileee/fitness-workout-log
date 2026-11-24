// src/lib/weeklyPlanStore.js
// Loads and saves the weekly plan in the Supabase table `weekly_plans`
// (one row per user, see supabase/migrations). The client is passed in, so
// the functions can be tested with a fake instead of a real Supabase project.
import { createDefaultWeeklyPlan, normalizeWeeklyPlan, planToDays } from "./weeklyPlan.js"
import { startOfWeek, toIsoDate } from "./adherence.js"
import { historyFromRows } from "./planHistory.js"

export const TABLE = "weekly_plans"
// One row per user and week (week_start = Monday, local time): the plan that applied that week.
export const HISTORY_TABLE = "weekly_plan_history"

// The Monday (YYYY-MM-DD, local time) a plan saved at `now` is filed under.
export function historyWeekOf(now = new Date()) {
  return toIsoDate(startOfWeek(now))
}

// Returns the saved plan, or the default plan when the user has never saved one.
// Throws on database errors (e.g. the migration was not run), so the caller
// can keep a working local plan and tell the user it isn't being saved.
export async function loadWeeklyPlan(client, userId) {
  const { data, error } = await client.from(TABLE).select("days").eq("user_id", userId).maybeSingle()
  if (error) throw error
  return data ? normalizeWeeklyPlan(data.days) : createDefaultWeeklyPlan()
}

// The user's plan history, oldest first (see planHistory.js). Throws on
// database errors; the caller treats a missing history as "no history".
export async function loadPlanHistory(client, userId) {
  const { data, error } = await client
    .from(HISTORY_TABLE)
    .select("week_start, days")
    .eq("user_id", userId)
    .order("week_start", { ascending: true })
  if (error) throw error
  return historyFromRows(data)
}

// Insert-or-update by primary key, so the first save and later edits are the same call.
// The plan is then also filed as this week's plan in the history. If that second
// write fails (e.g. its migration wasn't run), the plan itself is already saved and
// the error is passed to onHistoryError instead of failing the save.
export async function saveWeeklyPlan(client, userId, plan, { now = new Date(), onHistoryError = () => {} } = {}) {
  const days = planToDays(plan)
  const updatedAt = now.toISOString()
  const { error } = await client
    .from(TABLE)
    .upsert({ user_id: userId, days, updated_at: updatedAt }, { onConflict: "user_id" })
  if (error) throw error

  const { error: historyError } = await client
    .from(HISTORY_TABLE)
    .upsert(
      { user_id: userId, week_start: historyWeekOf(now), days, updated_at: updatedAt },
      { onConflict: "user_id,week_start" }
    )
  if (historyError) onHistoryError(historyError)
}

// Wraps a save function so that at most one save runs at a time. Changes made
// while a save is running are merged: only the newest value is saved next.
// Without this, two quick edits could reach the database out of order and
// leave the older plan saved. onStatus receives "saving", "saved" or "error"
// (with the error); "saved" is reported only once nothing is waiting.
export function createLatestSaver(save, onStatus = () => {}) {
  let running = false
  let pending = null // { value } of the newest unsaved change, or null

  async function run() {
    running = true
    while (pending) {
      const { value } = pending
      pending = null
      onStatus("saving")
      try {
        await save(value)
        if (!pending) onStatus("saved")
      } catch (error) {
        if (!pending) onStatus("error", error)
      }
    }
    running = false
  }

  let current = Promise.resolve()

  // Returns a promise that settles when everything requested so far is saved (or failed).
  return function request(value) {
    pending = { value }
    if (!running) current = run()
    return current
  }
}
