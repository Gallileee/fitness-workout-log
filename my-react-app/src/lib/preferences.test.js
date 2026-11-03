import { test, describe } from "vitest"
import assert from "node:assert/strict"
import {
  DEFAULT_PREFERENCES,
  STORAGE_KEY,
  sanitizePreferences,
  loadPreferences,
  savePreferences,
  resolveLayout,
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
})

describe("loadPreferences / savePreferences", () => {
  test("round-trips through storage", () => {
    const storage = memoryStorage()
    const prefs = { accent: "blue", density: "compact", layout: "mobile", units: "imperial", repRange: "12-15", restTimer: "off", font: "arcade", keepAwake: "on" }
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
