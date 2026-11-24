// Whole-app tests: the real App and components, with the in-memory demo
// client (the same one `npm run demo` uses) instead of Supabase.
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { supabase } from "./supabaseClient"
import App from "./App"
import { toIsoDate } from "./lib/adherence"
import { historyWeekOf } from "./lib/weeklyPlanStore"

vi.mock("./supabaseClient", () => import("./demo/demoSupabaseClient.js"))

// A query builder whose every call fails like an unreachable server.
function failingQuery(message) {
  const builder = {}
  for (const method of ["select", "insert", "update", "upsert", "delete", "eq", "order", "single", "maybeSingle"]) {
    builder[method] = () => builder
  }
  builder.then = (resolve) => resolve({ data: null, error: { message } })
  return builder
}

function failTable(table, message) {
  const original = supabase.from
  vi.spyOn(supabase, "from").mockImplementation((name) => (name === table ? failingQuery(message) : original(name)))
}

async function renderApp() {
  const user = userEvent.setup()
  render(<App />)
  // The demo account has sample workouts; wait until they are loaded. The first render in a
  // cold test worker can take over the default 1 s on a slow CI runner, so allow 5 s.
  await screen.findAllByText("Squat (Barbell Back)", {}, { timeout: 5000 })
  return user
}

async function fillNewWorkout(user, note) {
  await user.click(screen.getByRole("button", { name: "Nový trénink" }))
  const dialog = screen.getByRole("dialog")
  const form = within(dialog)
  // The form starts as today's planned workout; these tests pick their own date and type.
  await user.clear(form.getByLabelText("Datum"))
  await user.type(form.getByLabelText("Datum"), "2026-11-02")
  await user.selectOptions(form.getByLabelText("Typ tréninku"), "push")
  await user.selectOptions(form.getByLabelText("Cvik"), "Bench Press (Barbell)")
  await user.click(form.getByRole("button", { name: "Přidat cvik" }))
  await user.type(form.getByLabelText("Poznámka"), note)
  return form
}

describe("App", () => {
  beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {
      throw new Error("alert() should not be used")
    })
  })

  test("'Nový trénink' starts as today's planned workout, with last time's exercises", async () => {
    // A Friday at least a week ahead: the default plan has push on Fridays,
    // and no other test changes Friday or logs a workout on that date.
    const friday = new Date()
    friday.setDate(friday.getDate() + 7)
    while (friday.getDay() !== 5) friday.setDate(friday.getDate() + 1)
    friday.setHours(10, 0, 0, 0)
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(friday)
    try {
      const user = await renderApp()
      expect(screen.queryByRole("button", { name: /^Dnes/ })).toBeNull() // no separate shortcut
      await user.click(screen.getByRole("button", { name: "Nový trénink" }))

      const form = within(screen.getByRole("dialog"))
      expect(form.getByLabelText("Datum").value).toBe(toIsoDate(friday))
      expect(form.getByLabelText("Typ tréninku").value).toBe("push")

      // The demo account's push days include bench press.
      await user.click(form.getByRole("button", { name: "Bench Press (Barbell)" }))
      expect(form.getByText(/Minule/)).toBeTruthy()
      await user.click(form.getByRole("button", { name: "Přidat cvik" }))
      await user.click(form.getByRole("button", { name: "Uložit trénink" }))

      expect(screen.queryByRole("dialog")).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test("adding an exercise starts the rest timer, which keeps running after the dialog closes", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("button", { name: "Nový trénink" }))
    const form = within(screen.getByRole("dialog"))
    // The form starts as today's planned type, which depends on the weekday.
    await user.selectOptions(form.getByLabelText("Typ tréninku"), "push")
    await user.selectOptions(form.getByLabelText("Cvik"), "Bench Press (Barbell)")
    await user.click(form.getByRole("button", { name: "Přidat cvik" }))

    // Default setting: 1:30.
    expect(form.getByRole("timer").textContent).toMatch(/^1:(30|29)$/)

    await user.click(form.getByRole("button", { name: "Zrušit" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("timer").textContent).toMatch(/^1:(30|29|28)$/)

    await user.click(screen.getByRole("button", { name: "Zastavit pauzu" }))
    expect(screen.queryByRole("timer")).toBeNull()
  })

  test("a rep range chosen for one exercise is saved and used the next time", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("button", { name: "Nový trénink" }))
    let form = within(screen.getByRole("dialog"))
    await user.selectOptions(form.getByLabelText("Typ tréninku"), "push")
    await user.selectOptions(form.getByLabelText("Cvik"), "Bench Press (Barbell)")
    await user.selectOptions(form.getByLabelText("Rozsah pro tento cvik"), "4-6")
    expect(form.getByText("Návrh:").parentElement.textContent).toMatch(/horní hranice 4–6 → přidej váhu/)
    expect(JSON.parse(localStorage.getItem("preferences")).exerciseRepRanges).toEqual({ "bench press (barbell)": "4-6" })

    await user.click(form.getByRole("button", { name: "Zrušit" }))
    await user.click(screen.getByRole("button", { name: "Nový trénink" }))
    form = within(screen.getByRole("dialog"))
    await user.selectOptions(form.getByLabelText("Typ tréninku"), "push")
    await user.selectOptions(form.getByLabelText("Cvik"), "Bench Press (Barbell)")
    expect(form.getByLabelText("Rozsah pro tento cvik").value).toBe("4-6")
  })

  test("a corrupt stored user doesn't crash the app", async () => {
    localStorage.setItem("user", "{not json")
    await renderApp() // the demo session signs the user in
    expect(screen.getByRole("button", { name: "Nový trénink" })).toBeTruthy()
  })

  test("the top bar has the rest timer; email and logout are in Settings", async () => {
    const user = await renderApp()
    expect(screen.queryByText("demo@example.com")).toBeNull()
    expect(screen.queryByRole("button", { name: "Odhlásit se" })).toBeNull()

    await user.click(screen.getByRole("button", { name: "Pauza 1:30" }))
    expect(screen.getByRole("timer").textContent).toMatch(/^1:(30|29)$/)
    await user.click(screen.getByRole("button", { name: "Zastavit pauzu" }))
    expect(screen.getByRole("button", { name: "Pauza 1:30" })).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Nastavení" }))
    expect(screen.getByText("demo@example.com")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Odhlásit se" })).toBeTruthy()
  })

  test("with the notification on, a rest that ends in the background shows one", async () => {
    const shown = []
    function Notification(title, options) {
      shown.push({ title, options })
      this.close = () => {}
    }
    Notification.permission = "default"
    Notification.requestPermission = vi.fn(async () => (Notification.permission = "granted"))
    vi.stubGlobal("Notification", Notification)
    try {
      const user = await renderApp()
      await user.click(screen.getByRole("button", { name: "Nastavení" }))
      const group = screen.getByRole("radiogroup", { name: "Upozornit na konec pauzy" })
      await user.click(within(group).getByRole("radio", { name: "Zap." }))
      expect(Notification.requestPermission).toHaveBeenCalledOnce()
      await screen.findByText(/Zapnuto. Když budeš v jiné aplikaci/)
      expect(JSON.parse(localStorage.getItem("preferences")).restNotify).toBe("on")

      await user.click(screen.getByRole("button", { name: "Pauza 1:30" }))
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
      const now = Date.now()
      vi.spyOn(Date, "now").mockReturnValue(now + 91_000)
      await waitFor(() => expect(shown).toHaveLength(1))
      expect(shown[0]).toMatchObject({ title: "Pauza skončila", options: { tag: "rest-timer" } })
    } finally {
      delete document.visibilityState
      vi.unstubAllGlobals()
    }
  })

  test("without the notification setting, a rest that ends in the background shows none", async () => {
    const shown = []
    function Notification(title) {
      shown.push(title)
    }
    Notification.permission = "granted"
    vi.stubGlobal("Notification", Notification)
    try {
      const user = await renderApp()
      await user.click(screen.getByRole("button", { name: "Pauza 1:30" }))
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
      const now = Date.now()
      vi.spyOn(Date, "now").mockReturnValue(now + 91_000)
      await screen.findByText("Pauza skončila")
      expect(shown).toHaveLength(0)
    } finally {
      delete document.visibilityState
      vi.unstubAllGlobals()
    }
  })

  test("a font style and colour from Settings apply to the whole app", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("button", { name: "Nastavení" }))
    await user.click(screen.getByRole("radio", { name: /^Fantasy/ }))
    await user.click(screen.getByRole("radio", { name: "Oranžová" }))

    const shell = document.querySelector(".app-shell")
    expect(shell.dataset.font).toBe("fantasy")
    expect(shell.dataset.accent).toBe("orange")
    expect(JSON.parse(localStorage.getItem("preferences"))).toMatchObject({ font: "fantasy", accent: "orange" })
  })

  test("the weekly plan is the first tab and open by default, before the records", async () => {
    await renderApp()
    const tabs = screen.getAllByRole("tab")
    expect(tabs.map((t) => t.textContent)).toEqual(["Týdenní plán", "Osobní rekordy"])
    expect(tabs[0].getAttribute("aria-selected")).toBe("true")
    expect(screen.getByLabelText("Plán na Pondělí")).toBeTruthy()
  })

  describe("keeping the screen on during a workout", () => {
    // A fake navigator.wakeLock that tracks whether a lock is held.
    function stubWakeLock() {
      const state = { held: 0, requests: 0 }
      const wakeLock = {
        request: vi.fn(async () => {
          state.requests++
          state.held++
          const sentinel = Object.assign(new EventTarget(), {
            released: false,
            release: async () => {
              if (sentinel.released) return
              sentinel.released = true
              state.held--
              sentinel.dispatchEvent(new Event("release"))
            },
          })
          return sentinel
        }),
      }
      Object.defineProperty(navigator, "wakeLock", { value: wakeLock, configurable: true })
      return state
    }

    afterEach(() => {
      delete navigator.wakeLock
    })

    test("holds the lock from opening the form until the saved workout's rest is over", async () => {
      localStorage.setItem("preferences", JSON.stringify({ keepAwake: "workout" }))
      const lock = stubWakeLock()
      const user = await renderApp()
      expect(lock.requests).toBe(0)

      const form = await fillNewWorkout(user, "Wake lock test") // adding the exercise starts a rest
      await waitFor(() => expect(lock.held).toBe(1))
      await user.click(form.getByRole("button", { name: "Uložit trénink" }))
      await screen.findByText("Wake lock test")
      expect(lock.held).toBe(1) // the rest is still running

      await user.click(screen.getByRole("button", { name: "Zastavit pauzu" }))
      await waitFor(() => expect(lock.held).toBe(0)) // saved: no grace period
      expect(lock.requests).toBe(1)
    })

    test("keeps the lock for a while after the form is closed without saving", async () => {
      localStorage.setItem("preferences", JSON.stringify({ keepAwake: "workout", restTimer: "off" }))
      const lock = stubWakeLock()
      const user = await renderApp()

      await user.click(screen.getByRole("button", { name: "Nový trénink" }))
      await waitFor(() => expect(lock.held).toBe(1))
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Zavřít" }))
      expect(screen.queryByRole("dialog")).toBeNull()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(lock.held).toBe(1)
      expect(lock.requests).toBe(1) // never dropped and requested again
    })

    test("with 'Vyp.', opening a workout doesn't request a lock", async () => {
      const lock = stubWakeLock()
      const user = await renderApp()
      await user.click(screen.getByRole("button", { name: "Nový trénink" }))
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(lock.requests).toBe(0)
    })
  })

  test("a new workout appears in the list", async () => {
    const user = await renderApp()
    const form = await fillNewWorkout(user, "Added by the app test")
    await user.click(form.getByRole("button", { name: "Uložit trénink" }))

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(await screen.findByText("Added by the app test")).toBeTruthy()
  })

  test("when saving fails, the form stays open with the error and the entered data", async () => {
    const user = await renderApp()
    const form = await fillNewWorkout(user, "Must not get lost")
    failTable("workouts", "Failed to fetch")

    await user.click(form.getByRole("button", { name: "Uložit trénink" }))

    expect(screen.getByRole("dialog")).toBeTruthy()
    expect((await form.findByRole("alert")).textContent).toContain("Failed to fetch")
    expect(form.getByLabelText("Poznámka").value).toBe("Must not get lost")
    expect(form.getByText("Cviky v tréninku (1)")).toBeTruthy()

    // Once the connection is back, saving the same form works.
    vi.mocked(supabase.from).mockRestore()
    await user.click(form.getByRole("button", { name: "Uložit trénink" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(await screen.findByText("Must not get lost")).toBeTruthy()
  })

  test("deleting asks inside the card, not with confirm()", async () => {
    vi.spyOn(window, "confirm").mockImplementation(() => {
      throw new Error("confirm() should not be used")
    })
    const user = await renderApp()
    const form = await fillNewWorkout(user, "Delete me")
    await user.click(form.getByRole("button", { name: "Uložit trénink" }))
    const card = (await screen.findByText("Delete me")).closest("li")

    await user.click(within(card).getByRole("button", { name: /^Smazat trénink/ }))
    await user.click(within(card).getByRole("button", { name: "Zrušit" }))
    expect(screen.getByText("Delete me")).toBeTruthy()

    await user.click(within(card).getByRole("button", { name: /^Smazat trénink/ }))
    await user.click(within(card).getByRole("button", { name: "Smazat" }))
    await waitFor(() => expect(screen.queryByText("Delete me")).toBeNull())
  })

  test("when deleting fails, the workout stays with the error in its card", async () => {
    const user = await renderApp()
    const form = await fillNewWorkout(user, "Cannot delete me")
    await user.click(form.getByRole("button", { name: "Uložit trénink" }))
    const card = (await screen.findByText("Cannot delete me")).closest("li")

    failTable("workouts", "Failed to fetch")
    await user.click(within(card).getByRole("button", { name: /^Smazat trénink/ }))
    await user.click(within(card).getByRole("button", { name: "Smazat" }))

    expect((await within(card).findByRole("alert")).textContent).toBe("Nepovedlo se smazat trénink: Failed to fetch")
    expect(screen.getByText("Cannot delete me")).toBeTruthy()

    // Once the connection is back, deleting works.
    vi.mocked(supabase.from).mockRestore()
    await user.click(within(card).getByRole("button", { name: /^Smazat trénink/ }))
    await user.click(within(card).getByRole("button", { name: "Smazat" }))
    await waitFor(() => expect(screen.queryByText("Cannot delete me")).toBeNull())
  })

  test("when loading fails, the list says so and 'Zkusit znovu' loads again", async () => {
    failTable("workouts", "Failed to fetch")
    const user = userEvent.setup()
    render(<App />)

    const error = await screen.findByText("Nepovedlo se načíst tréninky: Failed to fetch", {}, { timeout: 5000 })
    expect(error.closest('[role="alert"]')).toBeTruthy()
    expect(screen.getByText("Tréninky se nenačetly.")).toBeTruthy()
    expect(screen.queryByText(/Přidej první/)).toBeNull()

    vi.mocked(supabase.from).mockRestore()
    await user.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect((await screen.findAllByText("Squat (Barbell Back)", {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Nepovedlo se načíst/)).toBeNull()
  })

  test("the workout form shows last time's numbers from the user's history", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("button", { name: "Nový trénink" }))
    const form = within(screen.getByRole("dialog"))
    await user.selectOptions(form.getByLabelText("Typ tréninku"), "legs")
    await user.selectOptions(form.getByLabelText("Cvik"), "Squat (Barbell Back)")

    // The demo account squats 4×5 every week.
    expect(form.getByText(/Minule/).parentElement.textContent).toMatch(/4×5 · \d/)
    expect(form.getByLabelText("Série").value).toBe("4")
    expect(form.getByLabelText("Opakování").value).toBe("5")
  })

  test("the rep range from Settings drives the overload suggestion", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("button", { name: "Nastavení" }))
    await user.click(screen.getByRole("radio", { name: "4–6" }))

    await user.click(screen.getByRole("button", { name: "Nový trénink" }))
    const form = within(screen.getByRole("dialog"))
    // The form starts as today's planned type, which depends on the weekday.
    await user.selectOptions(form.getByLabelText("Typ tréninku"), "push")
    await user.selectOptions(form.getByLabelText("Cvik"), "Bench Press (Barbell)")

    // The demo account's last bench was 4×6 · 87,5 kg: the top of 4–6, so add weight.
    expect(form.getByText("Návrh:").parentElement.textContent).toMatch(/4×4 · 90 kg \(horní hranice 4–6/)
  })

  test("changing the weekly plan saves it", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("tab", { name: "Týdenní plán" }))
    await user.selectOptions(screen.getByLabelText("Plán na Pondělí"), "core")

    expect(await screen.findByText("Plán uložen.")).toBeTruthy()
    const { data } = await supabase.from("weekly_plans").select("days").eq("user_id", "demo-user").maybeSingle()
    expect(data.days[0]).toBe("core")
  })

  test("a plan change is also filed as this week's plan in the history", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("tab", { name: "Týdenní plán" }))
    await user.selectOptions(screen.getByLabelText("Plán na Středa"), "fullbody")

    expect(await screen.findByText("Plán uložen.")).toBeTruthy()
    const { data } = await supabase
      .from("weekly_plan_history")
      .select("week_start, days")
      .eq("user_id", "demo-user")
      .eq("week_start", historyWeekOf())
    expect(data).toHaveLength(1)
    expect(data[0].days[2]).toBe("fullbody")
    // The demo history's older weeks (a three-day plan) are still measured by it.
    expect(screen.getByText(/podle plánu, který tehdy platil/)).toBeTruthy()
  })

  test("without the history table the plan still loads, saves and is measured", async () => {
    failTable("weekly_plan_history", 'relation "public.weekly_plan_history" does not exist')
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const user = await renderApp()
    await user.click(screen.getByRole("tab", { name: "Týdenní plán" }))
    expect(screen.getByText(/podle současného plánu/)).toBeTruthy()

    await user.selectOptions(screen.getByLabelText("Plán na Čtvrtek"), "core")
    expect(await screen.findByText("Plán uložen.")).toBeTruthy()
    expect(warn).toHaveBeenCalledWith("Historii plánu se nepovedlo načíst:", expect.anything())
    expect(warn).toHaveBeenCalledWith("Historie plánu se neuložila:", expect.anything())
  })

  test("a failed plan save is shown in the plan card", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("tab", { name: "Týdenní plán" }))
    failTable("weekly_plans", "permission denied")
    await user.selectOptions(screen.getByLabelText("Plán na Úterý"), "legs")

    expect((await screen.findByText(/Plán se nepovedlo uložit/)).textContent).toContain("permission denied")
    // The change stays on screen even though it wasn't saved.
    expect(screen.getByLabelText("Plán na Úterý").value).toBe("legs")
  })
})

describe("App on a phone (gym mode)", () => {
  beforeEach(() => {
    localStorage.setItem("preferences", JSON.stringify({ layout: "mobile" }))
  })

  test("the overview shows only the rest timer and today's workout", async () => {
    const user = await renderAppMobile()
    expect(screen.getByRole("region", { name: "Pauza" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Dnes" })).toBeTruthy()
    for (const gone of ["Souhrn", "Vývoj odhadu 1RM", "Osobní rekordy", "Týdenní plán", "Poslední tréninky"]) {
      expect(screen.queryByRole("heading", { name: gone })).toBeNull()
    }

    await user.click(screen.getByRole("button", { name: "Spustit 1:30" }))
    expect(screen.getByRole("timer").textContent).toMatch(/^1:(30|29)$/)
    // Only the big timer on the overview, not a second one in the app bar.
    expect(screen.getAllByRole("timer")).toHaveLength(1)
    await user.click(screen.getByRole("button", { name: "Zastavit" }))
    await user.click(screen.getByRole("button", { name: "2:00" }))
    expect(screen.getByRole("timer").textContent).toMatch(/^(2:00|1:59)$/)
    await user.click(screen.getByRole("button", { name: "Zastavit" }))
  })

  test("before the first exercise, the Dnes card starts today's workout and the timer steps back", async () => {
    // A Friday two weeks ahead (push in the default plan); no other test logs a workout then.
    const friday = new Date()
    friday.setDate(friday.getDate() + 14)
    while (friday.getDay() !== 5) friday.setDate(friday.getDate() + 1)
    friday.setHours(10, 0, 0, 0)
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(friday)
    try {
      const user = await renderAppMobile()
      expect(screen.getByText(/^Minule \(/)).toBeTruthy()
      expect(screen.getByRole("button", { name: "Spustit 1:30" }).className).toContain("btn-secondary")

      await user.click(screen.getByRole("button", { name: "Začít Push" }))
      const form = within(screen.getByRole("dialog"))
      expect(form.getByLabelText("Datum").value).toBe(toIsoDate(friday))
      expect(form.getByLabelText("Typ tréninku").value).toBe("push")
      expect(form.getByRole("button", { name: "Bench Press (Barbell)" })).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  test("summary, 1RM and records are under Tréninky → Pokrok", async () => {
    const user = await renderAppMobile()
    await user.click(screen.getByRole("button", { name: "Tréninky" }))
    expect(screen.queryByRole("heading", { name: "Osobní rekordy" })).toBeNull()

    await user.click(screen.getByRole("radio", { name: "Pokrok" }))
    expect(screen.getByRole("heading", { name: "Vývoj odhadu 1RM" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Osobní rekordy" })).toBeTruthy()
    expect(screen.getByText("Objem za 7 dní")).toBeTruthy()
  })
})

async function renderAppMobile() {
  const user = userEvent.setup()
  render(<App />)
  // The demo account's workouts are loaded once the Dnes card is there and the data has arrived.
  await screen.findByRole("heading", { name: "Dnes" })
  await new Promise((r) => setTimeout(r, 0))
  return user
}
