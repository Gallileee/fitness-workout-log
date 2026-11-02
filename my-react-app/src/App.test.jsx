// Whole-app tests: the real App and components, with the in-memory demo
// client (the same one `npm run demo` uses) instead of Supabase.
import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { supabase } from "./supabaseClient"
import App from "./App"
import { toIsoDate } from "./lib/adherence"

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
  // The demo account has sample workouts; wait until they are loaded.
  await screen.findAllByText("Squat (Barbell Back)")
  return user
}

async function fillNewWorkout(user, note) {
  await user.click(screen.getByRole("button", { name: "Nový trénink" }))
  const dialog = screen.getByRole("dialog")
  const form = within(dialog)
  await user.type(form.getByLabelText("Datum"), "2026-11-02")
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

  test("'Dnes' starts today's planned workout with last time's exercises", async () => {
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
      await user.click(screen.getByRole("button", { name: "Dnes: Push" }))

      const form = within(screen.getByRole("dialog"))
      expect(form.getByLabelText("Datum").value).toBe(toIsoDate(friday))
      expect(form.getByLabelText("Typ tréninku").value).toBe("push")

      // The demo account's push days include bench press.
      await user.click(form.getByRole("button", { name: "Bench Press (Barbell)" }))
      expect(form.getByText(/Minule/)).toBeTruthy()
      await user.click(form.getByRole("button", { name: "Přidat cvik" }))
      await user.click(form.getByRole("button", { name: "Uložit trénink" }))

      // Today's push is logged, so the shortcut disappears.
      expect(screen.queryByRole("dialog")).toBeNull()
      expect(screen.queryByRole("button", { name: "Dnes: Push" })).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  test("adding an exercise starts the rest timer, which keeps running after the dialog closes", async () => {
    const user = await renderApp()
    await user.click(screen.getByRole("button", { name: "Nový trénink" }))
    const form = within(screen.getByRole("dialog"))
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

  test("a corrupt stored user doesn't crash the app", async () => {
    localStorage.setItem("user", "{not json")
    await renderApp() // the demo session signs the user in
    expect(screen.getByRole("button", { name: "Nový trénink" })).toBeTruthy()
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
