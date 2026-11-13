import { describe, test, expect, vi, afterEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Settings from "./Settings"
import { DEFAULT_PREFERENCES, OPTIONS } from "../lib/preferences"
import { FONT_THEMES, loadFontTheme } from "../lib/fonts"

function setup(preferences = DEFAULT_PREFERENCES, workouts, wakeLockStatus) {
  const onChange = vi.fn()
  const onLogout = vi.fn()
  const user = userEvent.setup()
  render(
    <Settings
      preferences={preferences}
      onChange={onChange}
      user={{ email: "lifter@example.com" }}
      onLogout={onLogout}
      workouts={workouts}
      wakeLockStatus={wakeLockStatus}
    />,
  )
  return { user, onChange, onLogout }
}

describe("Settings", () => {
  test("is split into Vzhled, Trénink and Účet", () => {
    setup()
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Vzhled", "Trénink", "Účet"])
  })

  test("offers every accent colour as a labelled radio button", async () => {
    const { user, onChange } = setup()
    const group = screen.getByRole("radiogroup", { name: "Barva zvýraznění" })
    expect(within(group).getAllByRole("radio")).toHaveLength(OPTIONS.accent.length)
    expect(within(group).getByRole("radio", { name: "Fialová" }).checked).toBe(true)

    await user.click(within(group).getByRole("radio", { name: "Tyrkysová" }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, accent: "cyan" })
  })

  test("offers every font style with a preview, and selecting one saves it", async () => {
    const { user, onChange } = setup()
    const group = screen.getByRole("radiogroup", { name: "Styl písma" })
    expect(within(group).getAllByRole("radio")).toHaveLength(OPTIONS.font.length)
    expect(group.querySelectorAll(".font-sample")).toHaveLength(OPTIONS.font.length)

    await user.click(within(group).getByRole("radio", { name: /^Arkáda/ }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, font: "arcade" })
  })

  test("training settings and the account are there", async () => {
    const { user, onChange, onLogout } = setup()
    await user.click(screen.getByRole("radio", { name: "2:00" }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, restTimer: "120" })

    expect(screen.getByText("lifter@example.com")).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Odhlásit se" }))
    expect(onLogout).toHaveBeenCalledOnce()
  })
})

describe("Keep screen on", () => {
  test("is off by default and can be switched on", async () => {
    const { user, onChange } = setup()
    const group = screen.getByRole("radiogroup", { name: "Nechat obrazovku zapnutou" })
    expect(within(group).getByRole("radio", { name: "Vyp." }).checked).toBe(true)

    await user.click(within(group).getByRole("radio", { name: "Zap." }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, keepAwake: "on" })
  })

  test("says when the screen is being kept on", () => {
    setup({ ...DEFAULT_PREFERENCES, keepAwake: "on" }, [], "active")
    expect(screen.getByText("Zapnuto. Obrazovka teď zůstane svítit.")).toBeTruthy()
  })

  test("is disabled with an explanation where the browser lacks the API", () => {
    setup(DEFAULT_PREFERENCES, [], "unsupported")
    const group = screen.getByRole("radiogroup", { name: "Nechat obrazovku zapnutou" })
    for (const radio of within(group).getAllByRole("radio")) expect(radio.disabled).toBe(true)
    expect(screen.getByText(/^Tento prohlížeč to neumí/)).toBeTruthy()
  })
})

describe("CSV export", () => {
  afterEach(() => vi.restoreAllMocks())

  test("is disabled while there are no workouts", () => {
    setup()
    expect(screen.getByRole("button", { name: "Stáhnout CSV" }).disabled).toBe(true)
    expect(screen.getByText("Zatím není co exportovat.")).toBeTruthy()
  })

  test("downloads every workout as a dated CSV file", async () => {
    const workouts = [
      { id: 1, date: "2026-10-27", type: "pull", note: "", exercises: [{ name: "Pull-up", sets: 3, reps: 8, weight: 0 }] },
      { id: 2, date: "2026-10-31", type: "push", note: "", exercises: [{ name: "Bench Press", sets: 4, reps: 6, weight: 87.5 }] },
    ]
    let blob
    URL.createObjectURL = vi.fn((b) => {
      blob = b
      return "blob:export"
    })
    URL.revokeObjectURL = vi.fn()
    const clicked = []
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clicked.push({ href: this.getAttribute("href"), download: this.download })
    })

    const { user } = setup(DEFAULT_PREFERENCES, workouts)
    expect(screen.getByText(/^2 tréninky jako tabulka/)).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Stáhnout CSV" }))

    expect(clicked).toEqual([{ href: "blob:export", download: expect.stringMatching(/^workouts-\d{4}-\d{2}-\d{2}\.csv$/) }])
    const text = (await blob.text()).replace(/^\ufeff/, "")
    expect(text.split("\r\n")).toEqual([
      "date,workout_type,exercise,sets,reps,weight_kg,note",
      "2026-10-27,pull,Pull-up,3,8,0,",
      "2026-10-31,push,Bench Press,4,6,87.5,",
      "",
    ])
    await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export"))
  })
})

describe("plate calculator settings", () => {
  test("the bar options show their weight in the chosen unit", async () => {
    const { user, onChange } = setup()
    const group = screen.getByRole("radiogroup", { name: "Osa" })
    expect(within(group).getAllByRole("radio").map((r) => r.parentElement.textContent)).toEqual(["20 kg", "15 kg", "10 kg"])
    await user.click(within(group).getByRole("radio", { name: "15 kg" }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, bar: "light" })

    setup({ ...DEFAULT_PREFERENCES, units: "imperial" })
    expect(screen.getAllByRole("radiogroup", { name: "Osa" })[1].textContent).toBe("45 lb35 lb15 lb")
  })

  test("plates are toggled in the list of the current unit", async () => {
    const { user, onChange } = setup()
    const group = screen.getByRole("group", { name: "Dostupné kotouče" })
    expect(within(group).getByRole("checkbox", { name: "0,5 kg" }).checked).toBe(false)
    expect(within(group).getByRole("checkbox", { name: "25 kg" }).checked).toBe(true)

    await user.click(within(group).getByRole("checkbox", { name: "25 kg" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_PREFERENCES, platesMetric: [20, 15, 10, 5, 2.5, 1.25] })
    await user.click(within(group).getByRole("checkbox", { name: "0,5 kg" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_PREFERENCES, platesMetric: [...DEFAULT_PREFERENCES.platesMetric, 0.5] })
  })

  test("imperial units edit the pound plates and leave the kilo plates alone", async () => {
    const preferences = { ...DEFAULT_PREFERENCES, units: "imperial" }
    const { user, onChange } = setup(preferences)
    await user.click(screen.getByRole("checkbox", { name: "45 lb" }))
    expect(onChange).toHaveBeenCalledWith({ ...preferences, platesImperial: [35, 25, 10, 5, 2.5] })
  })
})

describe("font styles", () => {
  test("every font preference has a theme, and every theme is a valid preference", () => {
    expect(FONT_THEMES.map((t) => t.value)).toEqual(OPTIONS.font)
  })

  test("only the default style has nothing to load", () => {
    expect(FONT_THEMES.filter((t) => !t.load).map((t) => t.value)).toEqual(["default"])
  })

  test("loading never throws, also for unknown values", async () => {
    await expect(loadFontTheme("default")).resolves.toBeUndefined()
    await expect(loadFontTheme("nope")).resolves.toBeUndefined()
    await expect(loadFontTheme("arcade")).resolves.toBeUndefined()
  })
})
