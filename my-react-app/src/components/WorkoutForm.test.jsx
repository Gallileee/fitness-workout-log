import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import WorkoutForm from "./WorkoutForm"

function setup(props = {}) {
  const onSave = vi.fn()
  const user = userEvent.setup()
  render(<WorkoutForm onSave={onSave} onCancel={() => {}} {...props} />)
  return { user, onSave }
}

// Fills the "add exercise" fields; values are typed as text, like a user would.
async function addExercise(user, { name = "Bench Press (Barbell)", sets = "3", reps = "8", weight = "80" } = {}) {
  await user.selectOptions(screen.getByLabelText("Cvik"), name)
  for (const [label, value] of [
    ["Série", sets],
    ["Opakování", reps],
    [/^Váha/, weight],
  ]) {
    const input = screen.getByLabelText(label)
    await user.clear(input)
    if (value !== "") await user.type(input, value)
  }
  await user.click(screen.getByRole("button", { name: "Přidat cvik" }))
}

describe("WorkoutForm", () => {
  beforeEach(() => {
    // Validation must be shown in the form, never as a blocking browser dialog.
    vi.spyOn(window, "alert").mockImplementation(() => {
      throw new Error("alert() should not be used")
    })
  })

  test("adds an exercise and saves the workout", async () => {
    const { user, onSave } = setup()
    await user.type(screen.getByLabelText("Datum"), "2026-11-02")
    await addExercise(user)

    expect(screen.getByText("Cviky v tréninku (1)")).toBeTruthy()
    await user.type(screen.getByLabelText("Poznámka"), "Good session")
    await user.click(screen.getByRole("button", { name: "Uložit trénink" }))

    expect(onSave).toHaveBeenCalledOnce()
    const saved = onSave.mock.calls[0][0]
    expect(saved).toMatchObject({ date: "2026-11-02", type: "push", note: "Good session" })
    expect(saved.exercises).toHaveLength(1)
    expect(saved.exercises[0]).toMatchObject({ name: "Bench Press (Barbell)", sets: 3, reps: 8, weight: 80 })
  })

  test("weights typed in pounds are stored in kg", async () => {
    const { user, onSave } = setup({ units: "imperial", initialDate: "2026-11-02" })
    await addExercise(user, { weight: "225" })
    await user.click(screen.getByRole("button", { name: "Uložit trénink" }))
    expect(onSave.mock.calls[0][0].exercises[0].weight).toBeCloseTo(102.06, 2)
  })

  test("shows an error instead of adding an exercise without a name", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "Přidat cvik" }))
    expect(screen.getByRole("alert").textContent).toMatch(/název cviku/)
    expect(screen.getByText("Cviky v tréninku (0)")).toBeTruthy()
  })

  test.each([
    ["0 sets", { sets: "0" }, /série/i],
    ["empty reps", { reps: "" }, /opakování/i],
    ["fractional reps", { reps: "2.5" }, /opakování/i],
    ["negative weight", { weight: "-5" }, /váh/i],
  ])("rejects %s", async (_name, values, message) => {
    const { user } = setup()
    await addExercise(user, values)
    expect(screen.getByRole("alert").textContent).toMatch(message)
    expect(screen.getByText("Cviky v tréninku (0)")).toBeTruthy()
  })

  test("the error disappears once the exercise is valid", async () => {
    const { user } = setup()
    await addExercise(user, { sets: "0" })
    expect(screen.queryByRole("alert")).toBeTruthy()
    await addExercise(user)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("Cviky v tréninku (1)")).toBeTruthy()
  })

  test("does not save without a date or without exercises", async () => {
    const { user, onSave } = setup()
    // The date input is `required`, so the browser blocks the submit with its own message.
    await user.click(screen.getByRole("button", { name: "Uložit trénink" }))
    expect(onSave).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText("Datum"), "2026-11-02")
    await user.click(screen.getByRole("button", { name: "Uložit trénink" }))
    expect(screen.getByRole("alert").textContent).toMatch(/cvik/i)
    expect(onSave).not.toHaveBeenCalled()
  })

  test("shows the save error passed by the parent", () => {
    setup({ saveError: "Nepovedlo se uložit trénink: offline" })
    expect(screen.getByRole("alert").textContent).toContain("offline")
  })

  test("removing an exercise updates the list", async () => {
    const { user } = setup()
    await addExercise(user)
    await user.click(screen.getByRole("button", { name: "Odebrat Bench Press (Barbell)" }))
    expect(screen.getByText("Cviky v tréninku (0)")).toBeTruthy()
  })
})
