import { describe, test, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Settings from "./Settings"
import { DEFAULT_PREFERENCES, OPTIONS } from "../lib/preferences"
import { FONT_THEMES, loadFontTheme } from "../lib/fonts"

function setup(preferences = DEFAULT_PREFERENCES) {
  const onChange = vi.fn()
  const onLogout = vi.fn()
  const user = userEvent.setup()
  render(<Settings preferences={preferences} onChange={onChange} user={{ email: "lifter@example.com" }} onLogout={onLogout} />)
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
