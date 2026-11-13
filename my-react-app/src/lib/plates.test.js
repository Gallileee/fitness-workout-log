import { describe, test, expect } from "vitest"
import { BARS, DEFAULT_PLATES, PLATES, barWeight, isBarbellExercise, loadBar } from "./plates.js"

const KG = { bar: 20, plates: DEFAULT_PLATES.metric }
const LB = { bar: 45, plates: DEFAULT_PLATES.imperial }

describe("loadBar", () => {
  test("splits a common weight into the fewest plates, heaviest first", () => {
    expect(loadBar(100, KG)).toEqual({ status: "exact", perSide: [25, 15], loaded: 100, missing: 0 })
    expect(loadBar(142.5, KG).perSide).toEqual([25, 25, 10, 1.25])
    expect(loadBar(225, LB)).toEqual({ status: "exact", perSide: [45, 45], loaded: 225, missing: 0 })
    expect(loadBar(135, LB).perSide).toEqual([45])
  })

  test("keeps quarter-kilo plates exact (no floating point drift)", () => {
    expect(loadBar(62.5, KG)).toEqual({ status: "exact", perSide: [20, 1.25], loaded: 62.5, missing: 0 })
    expect(loadBar(61.25, { bar: 20, plates: PLATES.metric }).status).toBe("under")
    expect(loadBar(21, { bar: 20, plates: PLATES.metric }).perSide).toEqual([0.5])
  })

  test("the empty bar needs no plates", () => {
    expect(loadBar(20, KG)).toEqual({ status: "exact", perSide: [], loaded: 20, missing: 0 })
  })

  test("a target lighter than the bar is reported as such", () => {
    expect(loadBar(15, KG)).toMatchObject({ status: "belowBar", perSide: [] })
    expect(loadBar(Number.NaN, KG).status).toBe("belowBar")
  })

  test("an unreachable weight gives the heaviest load below it and what is missing", () => {
    expect(loadBar(83, KG)).toEqual({ status: "under", perSide: [25, 5, 1.25], loaded: 82.5, missing: 0.5 })
    expect(loadBar(46, LB)).toEqual({ status: "under", perSide: [], loaded: 45, missing: 1 })
  })

  test("beats greedy when the plate set has gaps", () => {
    // Greedy would take one 15 and get stuck at 50 kg; two 10s make it exactly.
    expect(loadBar(60, { bar: 20, plates: [15, 10] }).perSide).toEqual([10, 10])
    // 50 a side with 25s missing: 20 + 20 + 10, not 20 + 20 + 5 + 5.
    expect(loadBar(120, { bar: 20, plates: [20, 10, 5] }).perSide).toEqual([20, 20, 10])
  })

  test("without plates only the bar can be loaded", () => {
    expect(loadBar(60, { bar: 20, plates: [] })).toEqual({ status: "under", perSide: [], loaded: 20, missing: 40 })
  })

  test("ignores junk and duplicates in the plate list", () => {
    expect(loadBar(70, { bar: 20, plates: [25, 25, "x", -5, 0] }).perSide).toEqual([25])
  })

  test("stays fast for the heaviest weight the form allows", () => {
    const start = performance.now()
    const result = loadBar(1000, { bar: 20, plates: PLATES.metric })
    expect(result.status).toBe("exact")
    expect(result.perSide.reduce((a, b) => a + b, 0)).toBe(490)
    expect(performance.now() - start).toBeLessThan(200)
  })
})

describe("barWeight", () => {
  test("depends on the unit, falling back to the standard bar", () => {
    expect(barWeight("standard", "metric")).toBe(20)
    expect(barWeight("light", "imperial")).toBe(35)
    expect(barWeight("unknown", "imperial")).toBe(BARS.standard.imperial)
  })
})

describe("isBarbellExercise", () => {
  test.each([
    ["Bench Press (Barbell)", true],
    ["Squat (Barbell Back)", true],
    ["Deadlift (Conventional)", true],
    ["Romanian Deadlift", true],
    ["Front Squat", true],
    ["Velká činka – bench", true],
    ["Dumbbell Shoulder Press", false],
    ["Bulgarian Split Squat", false],
    ["Leg Press", false],
    ["", false],
  ])("%s -> %s", (name, expected) => {
    expect(isBarbellExercise(name)).toBe(expected)
  })
})
