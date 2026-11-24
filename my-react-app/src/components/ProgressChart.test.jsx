import { describe, test, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ProgressChart from "./ProgressChart"

const bench = (date, weight) => ({
  id: date,
  date,
  type: "push",
  exercises: [{ id: 1, name: "Bench Press (Barbell)", sets: 1, reps: 1, weight }],
})

const axisLabels = (container) => [...container.querySelectorAll(".progress-axis text")].map((t) => t.textContent)

describe("ProgressChart axis", () => {
  test("labels the highest value at the top and the lowest at the bottom", () => {
    const { container } = render(
      <ProgressChart workouts={[bench("2026-10-01", 80), bench("2026-10-08", 82.5), bench("2026-10-15", 90)]} units="metric" />
    )
    expect(axisLabels(container)).toEqual(["90", "80"])
    const [top, bottom] = [...container.querySelectorAll(".progress-axis text")].map((t) => Number(t.getAttribute("y")))
    expect(top).toBeLessThan(bottom)
    expect(screen.getByText(/3 tréninky · osa v kg/)).toBeTruthy()
  })

  test("decimals use a comma, and the dots start right of the labels", () => {
    const { container } = render(
      <ProgressChart workouts={[bench("2026-10-01", 77.5), bench("2026-10-08", 87.5)]} units="metric" />
    )
    expect(axisLabels(container)).toEqual(["87,5", "77,5"])
    const xs = [...container.querySelectorAll(".progress-dot")].map((c) => Number(c.getAttribute("cx")))
    expect(Math.min(...xs)).toBeGreaterThan(40)
  })

  test("a flat series has one label; five or more workouts use the genitive plural", () => {
    const same = ["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29"].map((d) => bench(d, 100))
    const { container } = render(<ProgressChart workouts={same} units="metric" />)
    expect(axisLabels(container)).toEqual(["100"])
    expect(screen.getByText(/5 tréninků/)).toBeTruthy()
  })
})
