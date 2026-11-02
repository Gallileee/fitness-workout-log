import { describe, test, expect } from "vitest"
import { parseRepRange, suggestProgression } from "./progression.js"
import { toDisplayWeight } from "./preferences.js"

describe("parseRepRange", () => {
  test("parses 'min-max'", () => {
    expect(parseRepRange("8-12")).toEqual([8, 12])
    expect(parseRepRange("4-6")).toEqual([4, 6])
  })

  test("falls back to 6–10 for invalid ranges", () => {
    for (const bad of ["", null, "abc", "10-6", "0-5", "6"]) expect(parseRepRange(bad)).toEqual([6, 10])
  })
})

describe("suggestProgression (double progression)", () => {
  test("below the top of the range: same weight, one more rep", () => {
    expect(suggestProgression({ sets: 4, reps: 6, weight: 87.5 })).toEqual({
      sets: 4,
      reps: 7,
      weight: 87.5,
      reason: "reps",
    })
  })

  test("below the bottom of the range still adds a rep", () => {
    expect(suggestProgression({ sets: 5, reps: 3, weight: 120 }, { repRange: "6-10" })).toMatchObject({
      reps: 4,
      weight: 120,
      reason: "reps",
    })
  })

  test("at the top of the range: next weight step, back to the bottom", () => {
    expect(suggestProgression({ sets: 3, reps: 10, weight: 87.5 })).toEqual({
      sets: 3,
      reps: 6,
      weight: 90,
      reason: "weight",
    })
    expect(suggestProgression({ sets: 3, reps: 12, weight: 40 }, { repRange: "8-12" })).toMatchObject({
      reps: 8,
      weight: 42.5,
    })
  })

  test("above the top of the range also adds weight", () => {
    expect(suggestProgression({ sets: 3, reps: 14, weight: 20 }, { repRange: "8-12" })).toMatchObject({
      reps: 8,
      weight: 22.5,
      reason: "weight",
    })
  })

  test("odd weights snap up to the next plate step", () => {
    expect(suggestProgression({ sets: 3, reps: 10, weight: 83 }).weight).toBe(85)
    expect(suggestProgression({ sets: 3, reps: 10, weight: 85 }).weight).toBe(87.5)
  })

  test("in pounds, the step is 5 lb and the result is stored in kg", () => {
    // 82.5 kg = 181.9 lb -> next 5 lb step is 185 lb.
    const s = suggestProgression({ sets: 3, reps: 10, weight: 82.5 }, { units: "imperial" })
    expect(s.reason).toBe("weight")
    expect(toDisplayWeight(s.weight, "imperial")).toBe(185)
    expect(s.weight).toBeCloseTo(83.91, 2)
  })

  test("bodyweight exercises only add reps", () => {
    expect(suggestProgression({ sets: 3, reps: 12, weight: 0 })).toEqual({
      sets: 3,
      reps: 13,
      weight: 0,
      reason: "bodyweight",
    })
  })

  test("returns null when the last entry can't be used", () => {
    expect(suggestProgression(null)).toBeNull()
    expect(suggestProgression({ sets: 0, reps: 8, weight: 50 })).toBeNull()
    expect(suggestProgression({ sets: 3, reps: 0, weight: 50 })).toBeNull()
    expect(suggestProgression({ sets: 3, reps: 8, weight: -5 })).toBeNull()
    expect(suggestProgression({ sets: "x", reps: 8, weight: 50 })).toBeNull()
  })
})
