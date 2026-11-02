import { describe, test, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import WeeklyPlan from "./WeeklyPlan"
import PlanAdherence from "./PlanAdherence"
import { createDefaultWeeklyPlan } from "../lib/weeklyPlan"
import { toIsoDate } from "../lib/adherence"

describe("WeeklyPlan", () => {
  const renderPlan = (props = {}) => {
    const handlers = { onChange: vi.fn(), onDayClick: vi.fn() }
    render(<WeeklyPlan plan={createDefaultWeeklyPlan()} activeType="all" {...handlers} {...props} />)
    return handlers
  }

  test("changing a day calls onChange with the whole updated plan", async () => {
    const { onChange } = renderPlan()
    await userEvent.setup().selectOptions(screen.getByLabelText("Plán na Čtvrtek"), "core")
    const plan = onChange.mock.calls[0][0]
    expect(plan).toHaveLength(7)
    expect(plan[3]).toEqual({ day: "Čtvrtek", type: "core" })
    expect(plan[0]).toEqual({ day: "Pondělí", type: "push" })
  })

  test("clicking a day passes that day to onDayClick", async () => {
    const { onDayClick } = renderPlan()
    await userEvent.setup().click(screen.getByRole("button", { name: "Středa" }))
    expect(onDayClick).toHaveBeenCalledWith(2, { day: "Středa", type: "legs" })
  })

  test("the selects are disabled while the plan loads", () => {
    renderPlan({ status: { state: "loading" } })
    expect(screen.getByText("Načítám plán…")).toBeTruthy()
    expect(screen.getAllByRole("combobox").every((el) => el.disabled)).toBe(true)
  })

  test("shows save errors with the message", () => {
    renderPlan({ status: { state: "error", message: "offline" } })
    expect(screen.getByRole("status").textContent).toMatch(/nepovedlo uložit \(offline\)/)
  })
})

describe("PlanAdherence", () => {
  // Wednesday 4 November 2026; the week runs Mon 2 – Sun 8 November.
  const today = new Date(2026, 10, 4, 12)
  const w = (date, type) => ({ date, type, exercises: [] })

  test("shows this week's count, the streak and a status per day", () => {
    const workouts = [
      w("2026-11-02", "push"),
      // Last week (26 Oct – 1 Nov) complete: 2× push, 2× pull, 1× legs.
      ...["push", "pull", "legs", "push", "pull"].map((type, i) => w(`2026-10-${26 + i}`, type)),
    ]
    render(<PlanAdherence plan={createDefaultWeeklyPlan()} workouts={workouts} today={today} />)

    expect(screen.getByText("1 / 5")).toBeTruthy()
    expect(screen.getByText("1 týden")).toBeTruthy()
    const days = screen.getByRole("list", { name: "Plnění plánu tento týden" })
    expect(days.textContent).toContain("Pondělí 2. 11.: Splněno")
    expect(days.textContent).toContain("Úterý 3. 11.: Vynecháno")
    expect(days.textContent).toContain("Středa 4. 11.: Dnes na plánu")
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("od 26. 10. 5 z 5")
  })

  test("uses Czech plural forms for the streak", () => {
    // Every Monday of the given number of past weeks gets all five planned sessions.
    const completeWeeks = (count) =>
      Array.from({ length: count }, (_, i) => toIsoDate(new Date(2026, 10, 2 - 7 * (i + 1)))).flatMap((monday) =>
        ["push", "pull", "legs", "push", "pull"].map((type) => w(monday, type))
      )
    for (const [count, text] of [
      [2, "2 týdny"],
      [5, "5 týdnů"],
    ]) {
      const { unmount } = render(
        <PlanAdherence plan={createDefaultWeeklyPlan()} workouts={completeWeeks(count)} today={today} />
      )
      expect(screen.getByText(text)).toBeTruthy()
      unmount()
    }
  })

  test("a plan with only rest days shows a message instead of the chart", () => {
    const restPlan = createDefaultWeeklyPlan().map((d) => ({ ...d, type: "off" }))
    render(<PlanAdherence plan={restPlan} workouts={[]} today={today} />)
    expect(screen.getByText(/nejsou žádné tréninky/)).toBeTruthy()
    expect(screen.queryByRole("img")).toBeNull()
  })
})
