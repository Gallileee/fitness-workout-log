// src/demo/demoSupabaseClient.js
// In-memory stand-in for the Supabase client, used by `npm run demo`
// (vite.config.js swaps it in for ../supabaseClient). It implements only the
// calls the app makes, with sample data, so the UI can be tried and tested
// without a Supabase project. Data resets on reload. Never used in a normal build.

const DEMO_USER = { id: "demo-user", email: "demo@example.com" }

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let nextId = 1
const ex = (name, sets, reps, weight) => ({ id: nextId++, name, sets, reps, weight })

// Eight weeks of a push/pull/legs routine with slowly increasing weights.
function sampleWorkouts() {
  const rows = []
  for (let week = 7; week >= 0; week--) {
    const add = (7 - week) * 2.5
    const base = week * 7
    rows.push({
      id: nextId++,
      user_id: DEMO_USER.id,
      date: isoDaysAgo(base + 6),
      type: "push",
      note: week === 0 ? "Bench felt strong, last set at RPE 9." : "",
      exercises: [
        ex("Bench Press (Barbell)", 4, 6, 70 + add),
        ex("Overhead Press (Barbell)", 3, 8, 40 + add / 2),
        ex("Triceps Pushdown (Cable)", 3, 12, 25),
      ],
    })
    rows.push({
      id: nextId++,
      user_id: DEMO_USER.id,
      date: isoDaysAgo(base + 5),
      type: "pull",
      note: "",
      exercises: [
        ex("Deadlift (Conventional)", 3, 5, 110 + add * 1.5),
        ex("Pull-up", 3, 8, 0),
        ex("Seated Cable Row", 3, 10, 55 + add / 2),
      ],
    })
    rows.push({
      id: nextId++,
      user_id: DEMO_USER.id,
      date: isoDaysAgo(base + 4),
      type: "legs",
      note: week === 2 ? "Knee a bit sore, kept the weight." : "",
      exercises: [
        ex("Squat (Barbell Back)", 4, 5, 90 + add),
        ex("Romanian Deadlift", 3, 8, 80 + add / 2),
      ],
    })
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1))
}

// Rows per table. weekly_plans starts empty, like for a new account.
const tables = { workouts: sampleWorkouts(), weekly_plans: [] }
let session = { user: DEMO_USER }
const listeners = new Set()

function notify(event) {
  for (const cb of listeners) cb(event, session)
}

const ok = (data) => Promise.resolve({ data, error: null })

// A tiny query builder covering select/insert/update/upsert/delete
// + eq/order/single/maybeSingle, for one table.
function query(table) {
  tables[table] ??= []
  const rows = () => tables[table]
  const setRows = (next) => {
    tables[table] = next
  }
  const state = { action: "select", filters: [], payload: null, onConflict: null, order: null, single: false, maybe: false }

  const matches = (row) => state.filters.every(([col, val]) => String(row[col]) === String(val))

  function run() {
    if (state.action === "insert") {
      const row = { ...state.payload, id: nextId++ }
      setRows([row, ...rows()])
      return ok(state.single ? row : [row])
    }
    if (state.action === "upsert") {
      const key = state.onConflict ?? "id"
      const existing = rows().find((r) => String(r[key]) === String(state.payload[key]))
      const row = existing ? { ...existing, ...state.payload } : { ...state.payload }
      setRows(existing ? rows().map((r) => (r === existing ? row : r)) : [row, ...rows()])
      return ok(state.single ? row : [row])
    }
    if (state.action === "update") {
      let updated = null
      setRows(rows().map((r) => (matches(r) ? (updated = { ...r, ...state.payload }) : r)))
      return ok(state.single ? updated : updated ? [updated] : [])
    }
    if (state.action === "delete") {
      setRows(rows().filter((r) => !matches(r)))
      return ok(null)
    }
    let result = rows().filter(matches)
    if (state.order) {
      const { col, ascending } = state.order
      result = [...result].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (ascending ? 1 : -1))
    }
    if (state.single && result.length !== 1) {
      // Like PostgREST: .single() needs exactly one row, .maybeSingle() zero or one.
      if (!(state.maybe && result.length === 0)) {
        return Promise.resolve({ data: null, error: { message: `Expected one row, got ${result.length}` } })
      }
    }
    return ok(state.single ? result[0] ?? null : result)
  }

  const builder = {
    select() {
      return builder
    },
    insert(payload) {
      state.action = "insert"
      state.payload = payload
      return builder
    },
    update(payload) {
      state.action = "update"
      state.payload = payload
      return builder
    },
    upsert(payload, { onConflict } = {}) {
      state.action = "upsert"
      state.payload = payload
      state.onConflict = onConflict ?? null
      return builder
    },
    delete() {
      state.action = "delete"
      return builder
    },
    eq(col, val) {
      state.filters.push([col, val])
      return builder
    },
    order(col, { ascending = true } = {}) {
      state.order = { col, ascending }
      return builder
    },
    single() {
      state.single = true
      return builder
    },
    maybeSingle() {
      state.single = true
      state.maybe = true
      return builder
    },
    then(resolve, reject) {
      return run().then(resolve, reject)
    },
  }
  return builder
}

export const supabase = {
  from: (table) => query(table),
  auth: {
    getSession: () => ok({ session }),
    onAuthStateChange(cb) {
      listeners.add(cb)
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
    },
    signInWithPassword: ({ email }) => {
      session = { user: { ...DEMO_USER, email: email || DEMO_USER.email } }
      notify("SIGNED_IN")
      return ok({ user: session.user, session })
    },
    signUp: (credentials) => supabase.auth.signInWithPassword(credentials),
    signOut: () => {
      session = null
      notify("SIGNED_OUT")
      return ok(null)
    },
  },
}
