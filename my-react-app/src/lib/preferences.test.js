import { test, describe } from "vitest"
import assert from "node:assert/strict"
import {
  DEFAULT_PREFERENCES,
  STORAGE_KEY,
  sanitizePreferences,
  loadPreferences,
  savePreferences,
  resolveLayout,
  platesKey,
  sanitizePlateLoading,
  withPlateLoading,
  sanitizeExerciseRepRanges,
  withExerciseRepRange,
  repRangeFor,
  toDisplayWeight,
  fromDisplayWeight,
  formatWeight,
  weightUnit,
} from "./preferences.js"

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
  }
}

describe("sanitizePreferences", () => {
  test("keeps valid values and fills in defaults", () => {
    assert.deepEqual(sanitizePreferences({ accent: "emerald", units: "imperial" }), {
      ...DEFAULT_PREFERENCES,
      accent: "emerald",
      units: "imperial",
    })
  })

  test("drops unknown keys and unsupported values", () => {
    assert.deepEqual(sanitizePreferences({ accent: "pink", layout: "tv", extra: 1 }), DEFAULT_PREFERENCES)
    assert.deepEqual(sanitizePreferences({ repRange: "5-500" }), DEFAULT_PREFERENCES)
    assert.equal(sanitizePreferences({ repRange: "8-12" }).repRange, "8-12")
    assert.equal(sanitizePreferences({ restTimer: "45" }).restTimer, "90")
    assert.equal(sanitizePreferences({ restTimer: "off" }).restTimer, "off")
    assert.equal(sanitizePreferences({ keepAwake: true }).keepAwake, "off")
    assert.equal(sanitizePreferences({ keepAwake: "on" }).keepAwake, "on")
    assert.deepEqual(sanitizePreferences(null), DEFAULT_PREFERENCES)
    assert.deepEqual(sanitizePreferences("compact"), DEFAULT_PREFERENCES)
  })

  test("bar and plate lists keep only known values, in order, without duplicates", () => {
    assert.equal(sanitizePreferences({ bar: "technique" }).bar, "technique")
    assert.equal(sanitizePreferences({ bar: "heavy" }).bar, "standard")
    assert.deepEqual(sanitizePreferences({ platesMetric: [5, 25, 7, "20", 5, 0.5] }).platesMetric, [25, 5, 0.5])
    assert.deepEqual(sanitizePreferences({ platesImperial: [] }).platesImperial, [])
    assert.deepEqual(sanitizePreferences({ platesImperial: "45" }).platesImperial, DEFAULT_PREFERENCES.platesImperial)
  })

  test("per-exercise plate loading keeps valid choices that differ from the default", () => {
    assert.deepEqual(
      sanitizePlateLoading({ "Leg Press ": "barbell", "T-Bar Row": "landmine", "Bench Press (Barbell)": "machine", Curl: "jetpack", "": "machine" }),
      { "leg press": "barbell", "bench press (barbell)": "machine" },
    )
    assert.deepEqual(sanitizePlateLoading(["machine"]), {})
    assert.deepEqual(sanitizePlateLoading("machine"), {})
    assert.deepEqual(sanitizePreferences({ plateLoading: { "leg press": "none" } }).plateLoading, { "leg press": "none" })
    assert.deepEqual(sanitizePreferences({}).plateLoading, {})
  })

  test("per-exercise plate loading is capped in size and key length", () => {
    const many = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`curl ${i}`, "barbell"]))
    assert.equal(Object.keys(sanitizePlateLoading(many)).length, 200)
    assert.deepEqual(sanitizePlateLoading({ ["x".repeat(101)]: "barbell" }), {})
  })

  test("withPlateLoading sets one choice and drops it again when back to the default", () => {
    const once = withPlateLoading({}, "Leg Press", "barbell")
    assert.deepEqual(once, { "leg press": "barbell" })
    assert.deepEqual(withPlateLoading(once, "LEG PRESS", "machine"), {})
    assert.deepEqual(withPlateLoading(once, "Curl", "barbell"), { "leg press": "barbell", curl: "barbell" })
  })

  test("per-exercise rep ranges keep allowed ranges under normalised keys, also one equal to the general range", () => {
    assert.deepEqual(
      sanitizeExerciseRepRanges({ " Lateral Raise ": "12-15", Squat: "6-10", Curl: "3-30", "": "8-12", Dip: 8 }),
      { "lateral raise": "12-15", squat: "6-10" },
    )
    assert.deepEqual(sanitizeExerciseRepRanges(["12-15"]), {})
    assert.deepEqual(sanitizeExerciseRepRanges(null), {})
    const many = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`cvik ${i}`, "8-12"]))
    assert.equal(Object.keys(sanitizeExerciseRepRanges(many)).length, 200)
    assert.deepEqual(sanitizeExerciseRepRanges({ ["x".repeat(101)]: "8-12" }), {})
    assert.deepEqual(sanitizePreferences({ exerciseRepRanges: { squat: "4-6" } }).exerciseRepRanges, { squat: "4-6" })
    assert.deepEqual(sanitizePreferences({}).exerciseRepRanges, {})
  })

  test("withExerciseRepRange sets a range and removes it with an empty value", () => {
    const once = withExerciseRepRange({}, "Lateral Raise", "12-15")
    assert.deepEqual(once, { "lateral raise": "12-15" })
    assert.deepEqual(withExerciseRepRange(once, "LATERAL RAISE", "8-12"), { "lateral raise": "8-12" })
    assert.deepEqual(withExerciseRepRange(once, "Lateral Raise", ""), {})
    assert.deepEqual(withExerciseRepRange(once, "Squat", "4-6"), { "lateral raise": "12-15", squat: "4-6" })
    assert.deepEqual(withExerciseRepRange(undefined, "Squat", "4-6"), { squat: "4-6" })
  })

  test("repRangeFor uses the exercise's own range, else the general one", () => {
    const map = { "lateral raise": "12-15" }
    assert.equal(repRangeFor("Lateral Raise ", map, "6-10"), "12-15")
    assert.equal(repRangeFor("Squat", map, "6-10"), "6-10")
    assert.equal(repRangeFor("Squat", undefined, "4-6"), "4-6")
  })

  test("platesKey picks the list for the unit", () => {
    assert.equal(platesKey("metric"), "platesMetric")
    assert.equal(platesKey("imperial"), "platesImperial")
  })
})

describe("loadPreferences / savePreferences", () => {
  test("round-trips through storage", () => {
    const storage = memoryStorage()
    const prefs = { accent: "blue", density: "compact", layout: "mobile", units: "imperial", repRange: "12-15", restTimer: "off", restNotify: "on", font: "arcade", keepAwake: "on", bar: "light", platesMetric: [20, 10, 5], platesImperial: [], plateLoading: { "leg press": "none", "squat (barbell back)": "machine" }, exerciseRepRanges: { "lateral raise": "12-15" } }
    assert.equal(savePreferences(storage, prefs), true)
    assert.deepEqual(loadPreferences(storage), prefs)
  })

  test("falls back to defaults for missing or corrupt data", () => {
    assert.deepEqual(loadPreferences(memoryStorage()), DEFAULT_PREFERENCES)
    assert.deepEqual(loadPreferences(memoryStorage({ [STORAGE_KEY]: "{not json" })), DEFAULT_PREFERENCES)
    assert.deepEqual(loadPreferences(undefined), DEFAULT_PREFERENCES)
  })

  test("survives storage that throws (private mode, blocked storage)", () => {
    const broken = {
      getItem() {
        throw new Error("SecurityError")
      },
      setItem() {
        throw new Error("QuotaExceededError")
      },
    }
    assert.deepEqual(loadPreferences(broken), DEFAULT_PREFERENCES)
    assert.equal(savePreferences(broken, DEFAULT_PREFERENCES), false)
  })

  test("never writes invalid values", () => {
    const storage = memoryStorage()
    savePreferences(storage, { accent: "<script>", units: "imperial" })
    assert.deepEqual(JSON.parse(storage.data[STORAGE_KEY]), { ...DEFAULT_PREFERENCES, units: "imperial" })
  })
})

describe("resolveLayout", () => {
  test("auto follows the viewport", () => {
    assert.equal(resolveLayout("auto", true), "mobile")
    assert.equal(resolveLayout("auto", false), "desktop")
  })

  test("an explicit choice overrides the viewport", () => {
    assert.equal(resolveLayout("desktop", true), "desktop")
    assert.equal(resolveLayout("mobile", false), "mobile")
  })
})

describe("weight units", () => {
  test("metric shows kilograms unchanged", () => {
    assert.equal(toDisplayWeight(82.5, "metric"), 82.5)
    assert.equal(fromDisplayWeight("82.5", "metric"), 82.5)
    assert.equal(weightUnit("metric"), "kg")
  })

  test("imperial converts to pounds and back", () => {
    assert.equal(toDisplayWeight(100, "imperial"), 220.5)
    assert.equal(fromDisplayWeight(225, "imperial"), 102.06)
    assert.equal(weightUnit("imperial"), "lb")
  })

  test("a typed pound value is shown again unchanged after storage", () => {
    for (const lb of [45, 135, 137.5, 225, 315, 405]) {
      assert.equal(toDisplayWeight(fromDisplayWeight(lb, "imperial"), "imperial"), lb, `${lb} lb`)
    }
  })

  test("invalid input becomes 0 instead of NaN", () => {
    assert.equal(toDisplayWeight("abc", "metric"), 0)
    assert.equal(fromDisplayWeight("", "imperial"), 0)
  })

  test("formatWeight adds the unit", () => {
    assert.equal(formatWeight(100, "metric", { locale: "en-US" }), "100 kg")
    assert.equal(formatWeight(100, "imperial", { locale: "en-US" }), "220.5 lb")
    assert.equal(formatWeight(12345, "metric", { decimals: 0, locale: "en-US" }), "12,345 kg")
  })
})
