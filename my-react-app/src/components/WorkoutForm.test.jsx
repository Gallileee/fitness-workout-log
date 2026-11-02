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
    [/^Váha \((kg|lb)\)$/, weight],
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

  test("+/− buttons change sets, reps and weight", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "Série: přidat 1" }))
    await user.click(screen.getByRole("button", { name: "Opakování: ubrat 1" }))
    await user.click(screen.getByRole("button", { name: "Váha (kg): přidat 2,5" }))
    expect(screen.getByLabelText("Série").value).toBe("4")
    expect(screen.getByLabelText("Opakování").value).toBe("9")
    expect(screen.getByLabelText("Váha (kg)").value).toBe("62.5")
  })

  test("− stops at the minimum, and lb steps by 5", async () => {
    const { user } = setup({ units: "imperial" })
    const sets = screen.getByLabelText("Série")
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole("button", { name: "Série: ubrat 1" }))
    expect(sets.value).toBe("1")
    await user.click(screen.getByRole("button", { name: "Váha (lb): přidat 5" }))
    expect(screen.getByLabelText("Váha (lb)").value).toBe("140")
  })

  test("removing an exercise updates the list", async () => {
    const { user } = setup()
    await addExercise(user)
    await user.click(screen.getByRole("button", { name: "Odebrat Bench Press (Barbell)" }))
    expect(screen.getByText("Cviky v tréninku (0)")).toBeTruthy()
  })
})

describe("WorkoutForm: last time", () => {
  const history = [
    {
      id: 1,
      date: "2026-10-27",
      type: "push",
      exercises: [
        { name: "Bench Press (Barbell)", sets: 4, reps: 6, weight: 82.5 },
        { name: "Bench Press (Barbell)", sets: 1, reps: 3, weight: 90 },
      ],
    },
    { id: 2, date: "2026-11-05", type: "push", exercises: [{ name: "Bench Press (Barbell)", sets: 3, reps: 5, weight: 95 }] },
    { id: 3, date: "2026-10-20", type: "push", exercises: [{ name: "Cable Fly", sets: 3, reps: 15, weight: 0 }] },
  ]

  test("choosing an exercise shows last time and fills in its numbers", async () => {
    const { user } = setup({ history, initialDate: "2026-11-02" })
    await user.selectOptions(screen.getByLabelText("Cvik"), "Bench Press (Barbell)")

    // The workout on 5 Nov is after this one's date, so 27 Oct is "last time".
    expect(screen.getByText(/Minule/).parentElement.textContent).toMatch(/4×6 · 82,5 kg, 1×3 · 90 kg/)
    expect(screen.getByLabelText("Série").value).toBe("4")
    expect(screen.getByLabelText("Opakování").value).toBe("6")
    expect(screen.getByLabelText("Váha (kg)").value).toBe("82.5")
  })

  test("in pounds, the filled-in weight is converted", async () => {
    const { user } = setup({ history, units: "imperial", initialDate: "2026-11-02" })
    await user.selectOptions(screen.getByLabelText("Cvik"), "Bench Press (Barbell)")
    expect(screen.getByLabelText("Váha (lb)").value).toBe("181.9")
  })

  test("a custom name shows last time, and Použít fills it in", async () => {
    const { user } = setup({ history })
    await user.click(screen.getByLabelText("Vlastní název cviku"))
    await user.type(screen.getByLabelText("Cvik"), "cable fly")

    expect(screen.getByText(/Minule/).parentElement.textContent).toMatch(/3×15$/)
    expect(screen.getByLabelText("Série").value).toBe("3") // not filled in while typing
    await user.click(screen.getByRole("button", { name: "Použít" }))
    expect(screen.getByLabelText("Opakování").value).toBe("15")
    expect(screen.getByLabelText("Váha (kg)").value).toBe("0")
  })

  const suggestionText = () => screen.getByText("Návrh:").parentElement.textContent

  test("suggests one more rep below the top of the rep range", async () => {
    const { user } = setup({ history, initialDate: "2026-11-02" })
    await user.selectOptions(screen.getByLabelText("Cvik"), "Bench Press (Barbell)")
    expect(suggestionText()).toMatch(/4×7 · 82,5 kg \(\+1 opakování\)/)

    await user.click(screen.getByRole("button", { name: "Použít návrh" }))
    expect(screen.getByLabelText("Série").value).toBe("4")
    expect(screen.getByLabelText("Opakování").value).toBe("7")
    expect(screen.getByLabelText("Váha (kg)").value).toBe("82.5")
  })

  test("at the top of the rep range suggests more weight and the bottom of the range", async () => {
    const { user } = setup({ history, initialDate: "2026-11-02", repRange: "4-6" })
    await user.selectOptions(screen.getByLabelText("Cvik"), "Bench Press (Barbell)")
    expect(suggestionText()).toMatch(/4×4 · 85 kg \(horní hranice 4–6 → přidej váhu\)/)

    await user.click(screen.getByRole("button", { name: "Použít návrh" }))
    expect(screen.getByLabelText("Opakování").value).toBe("4")
    expect(screen.getByLabelText("Váha (kg)").value).toBe("85")
  })

  test("in pounds the weight step is 5 lb", async () => {
    const { user } = setup({ history, initialDate: "2026-11-02", repRange: "4-6", units: "imperial" })
    await user.selectOptions(screen.getByLabelText("Cvik"), "Bench Press (Barbell)")
    await user.click(screen.getByRole("button", { name: "Použít návrh" }))
    expect(screen.getByLabelText("Váha (lb)").value).toBe("185")
  })

  test("a bodyweight exercise only gets one more rep", async () => {
    const { user } = setup({ history })
    await user.click(screen.getByLabelText("Vlastní název cviku"))
    await user.type(screen.getByLabelText("Cvik"), "Cable Fly")
    expect(suggestionText()).toMatch(/3×16 \(\+1 opakování\)$/)
  })

  test("no hint for an exercise that was never logged", async () => {
    const { user } = setup({ history })
    await user.selectOptions(screen.getByLabelText("Cvik"), "Overhead Press (Barbell)")
    expect(screen.queryByText(/Minule/)).toBeNull()
    expect(screen.getByLabelText("Série").value).toBe("3")
  })
})
