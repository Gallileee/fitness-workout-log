import { describe, test, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import TodayCard from "./TodayCard"
import RestTimerPanel from "./RestTimerPanel"

describe("TodayCard", () => {
  const today = { date: "2026-11-02", type: "push" }

  test("before anything is logged: last time's exercises and a button that starts the workout", async () => {
    const onStart = vi.fn()
    const planned = {
      ...today,
      exerciseNames: ["Bench Press (Barbell)", "Dips"],
      sourceDate: "2026-10-30",
    }
    render(<TodayCard today={planned} workouts={[]} units="metric" onEdit={() => {}} onStart={onStart} />)
    expect(screen.getByText("Plán: Push")).toBeTruthy()
    expect(screen.getByText(/^Minule \(/).textContent).toBe("Minule (pá 30. 10.)")
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Bench Press (Barbell)", "Dips"])

    await userEvent.setup().click(screen.getByRole("button", { name: "Začít Push" }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  test("the first workout of a type still gets the start button", () => {
    render(<TodayCard today={today} workouts={[]} units="metric" onEdit={() => {}} onStart={() => {}} />)
    expect(screen.getByText(/Zatím žádný předchozí trénink/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Začít Push" })).toBeTruthy()
  })

  test("once something is logged, the card shows it instead of the start button", () => {
    const workouts = [{ id: 1, date: "2026-11-02", type: "push", exercises: [{ id: 1, name: "Dips", sets: 3, reps: 10 }] }]
    render(<TodayCard today={today} workouts={workouts} units="metric" onEdit={() => {}} onStart={() => {}} />)
    expect(screen.queryByRole("button", { name: /^Začít/ })).toBeNull()
  })

  test("lists today's exercises and opens the workout for editing", async () => {
    const onEdit = vi.fn()
    const workouts = [
      {
        id: 7,
        date: "2026-11-02",
        type: "push",
        exercises: [
          { id: 1, name: "Bench Press (Barbell)", sets: 4, reps: 6, weight: 87.5 },
          { id: 2, name: "Dips", sets: 3, reps: 10, weight: 0 },
        ],
      },
    ]
    render(<TodayCard today={today} workouts={workouts} units="metric" onEdit={onEdit} />)
    expect(screen.getByText("4×6 · 87,5 kg")).toBeTruthy()
    expect(screen.getByText("3×10")).toBeTruthy()

    await userEvent.setup().click(screen.getByRole("button", { name: "Upravit" }))
    expect(onEdit).toHaveBeenCalledWith(7)
  })

  test("a rest day says so and still lets you log a workout", async () => {
    const onStart = vi.fn()
    render(
      <TodayCard today={{ date: "2026-11-05", type: "off" }} workouts={[]} units="metric" onEdit={() => {}} onStart={onStart} />
    )
    expect(screen.getByText("Plán: Volno")).toBeTruthy()
    await userEvent.setup().click(screen.getByRole("button", { name: "Zapsat trénink" }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})

describe("RestTimerPanel", () => {
  const timer = (state = {}) => ({
    running: false,
    finished: false,
    remaining: 0,
    start: vi.fn(),
    addTime: vi.fn(),
    stop: vi.fn(),
    dismiss: vi.fn(),
    ...state,
  })

  test("idle: one big start button with the default length, and the other lengths", async () => {
    const t = timer()
    render(<RestTimerPanel timer={t} restSeconds={120} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Spustit 2:00" }))
    expect(t.start).toHaveBeenCalledWith(120)
    expect(screen.queryByRole("button", { name: "2:00" })).toBeNull() // not offered twice
    await user.click(screen.getByRole("button", { name: "3:00" }))
    expect(t.start).toHaveBeenLastCalledWith(180)
  })

  test("with the automatic timer off, the start button still uses 1:30", () => {
    render(<RestTimerPanel timer={timer()} restSeconds={null} />)
    expect(screen.getByRole("button", { name: "Spustit 1:30" })).toBeTruthy()
  })

  test("not primary (nothing logged today yet): the start button steps back to secondary", () => {
    const { unmount } = render(<RestTimerPanel timer={timer()} restSeconds={90} primary={false} />)
    expect(screen.getByRole("button", { name: "Spustit 1:30" }).className).toContain("btn-secondary")
    unmount()
    render(<RestTimerPanel timer={timer()} restSeconds={90} />)
    expect(screen.getByRole("button", { name: "Spustit 1:30" }).className).toContain("btn-primary")
  })

  test("running: a big clock with +30 s and stop", async () => {
    const t = timer({ running: true, remaining: 75 })
    render(<RestTimerPanel timer={t} restSeconds={90} />)
    expect(screen.getByRole("timer").textContent).toBe("1:15")
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "+30 s" }))
    await user.click(screen.getByRole("button", { name: "Zastavit" }))
    expect(t.addTime).toHaveBeenCalledWith(30)
    expect(t.stop).toHaveBeenCalledOnce()
  })

  test("finished: says so, and one tap clears it", async () => {
    const t = timer({ finished: true })
    render(<RestTimerPanel timer={t} restSeconds={90} />)
    expect(screen.getByRole("status").textContent).toBe("Pauza skončila")
    await userEvent.setup().click(screen.getByRole("button", { name: "Jdu na sérii" }))
    expect(t.dismiss).toHaveBeenCalledOnce()
  })
})
