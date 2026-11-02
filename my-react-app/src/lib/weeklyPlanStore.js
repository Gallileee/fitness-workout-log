// src/lib/weeklyPlanStore.js
// Loads and saves the weekly plan in the Supabase table `weekly_plans`
// (one row per user, see supabase/migrations). The client is passed in, so
// the functions can be tested with a fake instead of a real Supabase project.
import { createDefaultWeeklyPlan, normalizeWeeklyPlan, planToDays } from "./weeklyPlan.js"

export const TABLE = "weekly_plans"

// Returns the saved plan, or the default plan when the user has never saved one.
// Throws on database errors (e.g. the migration was not run), so the caller
// can keep a working local plan and tell the user it isn't being saved.
export async function loadWeeklyPlan(client, userId) {
  const { data, error } = await client.from(TABLE).select("days").eq("user_id", userId).maybeSingle()
  if (error) throw error
  return data ? normalizeWeeklyPlan(data.days) : createDefaultWeeklyPlan()
}

// Insert-or-update by primary key, so the first save and later edits are the same call.
export async function saveWeeklyPlan(client, userId, plan) {
  const row = { user_id: userId, days: planToDays(plan), updated_at: new Date().toISOString() }
  const { error } = await client.from(TABLE).upsert(row, { onConflict: "user_id" })
  if (error) throw error
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
