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

let rows = sampleWorkouts()
let session = { user: DEMO_USER }
const listeners = new Set()

function notify(event) {
  for (const cb of listeners) cb(event, session)
}

const ok = (data) => Promise.resolve({ data, error: null })

// A tiny query builder covering select/insert/update/delete + eq/order/single.
function query() {
  const state = { action: "select", filters: [], payload: null, order: null, single: false }

  const matches = (row) => state.filters.every(([col, val]) => String(row[col]) === String(val))

  function run() {
    if (state.action === "insert") {
      const row = { ...state.payload, id: nextId++ }
      rows = [row, ...rows]
      return ok(state.single ? row : [row])
    }
    if (state.action === "update") {
      let updated = null
      rows = rows.map((r) => (matches(r) ? (updated = { ...r, ...state.payload }) : r))
      return ok(state.single ? updated : updated ? [updated] : [])
    }
    if (state.action === "delete") {
      rows = rows.filter((r) => !matches(r))
      return ok(null)
    }
    let result = rows.filter(matches)
    if (state.order) {
      const { col, ascending } = state.order
      result = [...result].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (ascending ? 1 : -1))
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
    then(resolve, reject) {
      return run().then(resolve, reject)
    },
  }
  return builder
}

export const supabase = {
  from: () => query(),
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
