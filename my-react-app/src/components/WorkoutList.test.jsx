import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, within, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import WorkoutList from "./WorkoutList"

const WORKOUTS = [
  { id: 1, date: "2026-11-02", type: "push", exercises: [{ id: "a", name: "Bench Press (Barbell)", sets: 3, reps: 8, weight: 80 }] },
  { id: 2, date: "2026-11-04", type: "legs", exercises: [{ id: "b", name: "Leg Press", sets: 4, reps: 10, weight: 180 }] },
]

function setup(props = {}) {
  const user = userEvent.setup()
  const onDelete = props.onDelete ?? vi.fn().mockResolvedValue(undefined)
  const onEdit = vi.fn()
  const view = render(<WorkoutList workouts={WORKOUTS} units="metric" onEdit={onEdit} onDelete={onDelete} {...props} />)
  return { user, onDelete, onEdit, ...view }
}

function card(date) {
  return screen.getByRole("button", { name: `Smazat trénink ${date}` }).closest("li")
}

describe("WorkoutList deleting", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockImplementation(() => {
      throw new Error("confirm() should not be used")
    })
    vi.spyOn(window, "alert").mockImplementation(() => {
      throw new Error("alert() should not be used")
    })
  })

  test("the trash button asks in the card, focuses Zrušit, and deletes only on Smazat", async () => {
    const { user, onDelete } = setup()
    await user.click(screen.getByRole("button", { name: "Smazat trénink 2026-11-02" }))

    const confirmRow = within(card("2026-11-02")).getByRole("group", { name: "Potvrzení smazání" })
    expect(confirmRow.textContent).toContain("Smazat celý trénink?")
    expect(document.activeElement).toBe(within(confirmRow).getByRole("button", { name: "Zrušit" }))
    // Only that card asks.
    expect(within(card("2026-11-04")).queryByRole("group")).toBeNull()
    expect(onDelete).not.toHaveBeenCalled()

    await user.click(within(confirmRow).getByRole("button", { name: "Smazat" }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(1)
    expect(screen.queryByRole("group", { name: "Potvrzení smazání" })).toBeNull()
  })

  test("Zrušit and Escape cancel and give focus back to the trash button", async () => {
    const { user, onDelete } = setup()
    const trash = screen.getByRole("button", { name: "Smazat trénink 2026-11-04" })

    await user.click(trash)
    await user.click(screen.getByRole("button", { name: "Zrušit" }))
    expect(screen.queryByRole("group", { name: "Potvrzení smazání" })).toBeNull()
    expect(document.activeElement).toBe(trash)

    await user.click(trash)
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("group", { name: "Potvrzení smazání" })).toBeNull()
    expect(document.activeElement).toBe(trash)
    expect(onDelete).not.toHaveBeenCalled()
  })

  test("asking on another card moves the question there", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "Smazat trénink 2026-11-02" }))
    await user.click(screen.getByRole("button", { name: "Smazat trénink 2026-11-04" }))
    expect(screen.getAllByRole("group", { name: "Potvrzení smazání" })).toHaveLength(1)
    expect(within(card("2026-11-04")).getByRole("group")).toBeTruthy()
  })

  test("while deleting the card says Mažu… and its buttons are disabled", async () => {
    let finish
    const onDelete = vi.fn(() => new Promise((resolve) => (finish = resolve)))
    const { user } = setup({ onDelete })
    await user.click(screen.getByRole("button", { name: "Smazat trénink 2026-11-02" }))
    await user.click(screen.getByRole("button", { name: "Smazat" }))

    const first = within(card("2026-11-02"))
    expect(first.getByRole("status").textContent).toBe("Mažu…")
    expect(first.getByRole("button", { name: /^Smazat trénink/ }).disabled).toBe(true)
    expect(first.getByRole("button", { name: /^Upravit trénink/ }).disabled).toBe(true)

    await act(async () => finish())
    expect(screen.queryByRole("status")).toBeNull()
  })

  test("a failed delete keeps the workout and shows the error in its card", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("Failed to fetch"))
    const { user } = setup({ onDelete })
    const trash = screen.getByRole("button", { name: "Smazat trénink 2026-11-02" })
    await user.click(trash)
    await user.click(screen.getByRole("button", { name: "Smazat" }))

    const error = await within(card("2026-11-02")).findByRole("alert")
    expect(error.textContent).toBe("Nepovedlo se smazat trénink: Failed to fetch")
    expect(within(card("2026-11-04")).queryByRole("alert")).toBeNull()
    expect(document.activeElement).toBe(trash)
    expect(trash.disabled).toBe(false)

    // Asking again clears the old error.
    await user.click(trash)
    expect(within(card("2026-11-02")).queryByRole("alert")).toBeNull()
  })

  test("a rejection without a message still says what failed", async () => {
    const onDelete = vi.fn().mockRejectedValue(undefined)
    const { user } = setup({ onDelete })
    await user.click(screen.getByRole("button", { name: "Smazat trénink 2026-11-04" }))
    await user.click(screen.getByRole("button", { name: "Smazat" }))
    expect((await screen.findByRole("alert")).textContent).toBe("Nepovedlo se smazat trénink: neznámá chyba")
  })

  test("the empty text is shown when there are no workouts", () => {
    setup({ workouts: [], emptyText: "Nic tu není." })
    expect(screen.getByText("Nic tu není.")).toBeTruthy()
  })
})

describe("WorkoutList paging", () => {
  const many = Array.from({ length: 23 }, (_, i) => ({
    id: i + 1,
    date: `2026-10-${String(i + 1).padStart(2, "0")}`,
    type: "push",
    exercises: [],
  }))
  const cards = () => screen.getAllByRole("button", { name: /^Smazat trénink/ })

  test("shows a page, and Zobrazit další adds the next one until all are shown", async () => {
    const { user } = setup({ workouts: many, pageSize: 10 })
    expect(cards()).toHaveLength(10)

    await user.click(screen.getByRole("button", { name: "Zobrazit další (10 z 13)" }))
    expect(cards()).toHaveLength(20)

    await user.click(screen.getByRole("button", { name: "Zobrazit další (3 z 3)" }))
    expect(cards()).toHaveLength(23)
    expect(screen.queryByRole("button", { name: /Zobrazit další/ })).toBeNull()
  })

  test("without a page size everything is shown", () => {
    setup({ workouts: many })
    expect(cards()).toHaveLength(23)
    expect(screen.queryByRole("button", { name: /Zobrazit další/ })).toBeNull()
  })
})
