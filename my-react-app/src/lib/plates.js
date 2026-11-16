// src/lib/plates.js
// Plate calculator: which plates to put on each side of the bar for a target weight.
// Everything here works in the display unit (kg or lb), because plates in a gym are
// labelled in one unit and a "20 kg" plate is not 44.09 lb on the bar.
// Pure functions, tested with Vitest.

// Bar weight by bar type and unit. Olympic men's bar, women's bar, technique bar.
export const BARS = {
  standard: { metric: 20, imperial: 45 },
  light: { metric: 15, imperial: 35 },
  technique: { metric: 10, imperial: 15 },
}

// Plates that can be switched on or off in Settings, heaviest first.
export const PLATES = {
  metric: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5],
  imperial: [45, 35, 25, 10, 5, 2.5],
}

// Fractional plates are rare in a commercial gym, so they start switched off.
export const DEFAULT_PLATES = {
  metric: [25, 20, 15, 10, 5, 2.5, 1.25],
  imperial: [45, 35, 25, 10, 5, 2.5],
}

// Exercises loaded on a barbell, judged by the name (the exercise list has no equipment field).
// Custom names count too: "Squat (Barbell Back)", "Deadlift (Sumo)", "Velká činka – bench".
const BARBELL_NAME = /barbell|deadlift|front squat|velk[áa] činka|\bosa\b/i
export function isBarbellExercise(name) {
  return BARBELL_NAME.test(String(name || ""))
}

// How an exercise is loaded with plates:
//   "barbell"   on both sleeves of a bar; the bar counts (bench press, squat)
//   "machine"   on both sides of a plate-loaded machine; only the plates count, because
//               the sled's own weight differs between machines (leg press, hack squat)
//   "landmine"  on one end of a bar fixed at the other; only the plates count (T-bar row)
//   "none"      no plate calculator (dumbbells, cables, bodyweight)
export const LOADINGS = ["barbell", "machine", "landmine", "none"]

const MACHINE_NAME = /leg press|hack squat|belt squat|pendulum squat|\bsled\b|plate[- ]loaded|na kotouče/i
const LANDMINE_NAME = /t-bar|landmine|meadows row/i

// The loading the exercise's name suggests. Landmine and machine names are checked first:
// "T-Bar Row (Barbell)" is loaded on one end even though its name says barbell.
export function defaultLoading(name) {
  const text = String(name || "")
  if (LANDMINE_NAME.test(text)) return "landmine"
  if (MACHINE_NAME.test(text)) return "machine"
  if (isBarbellExercise(text)) return "barbell"
  return "none"
}

// The user's choice for this exercise (Settings keep one per name, case-insensitive),
// else the default by name.
export function loadingFor(name, overrides = {}) {
  const chosen = overrides?.[exerciseKey(name)]
  return LOADINGS.includes(chosen) ? chosen : defaultLoading(name)
}

// Key for per-exercise choices: "Leg Press" and "leg press " are the same exercise.
export function exerciseKey(name) {
  return String(name || "").trim().toLowerCase()
}

export function barWeight(bar, units) {
  const weights = BARS[bar] ?? BARS.standard
  return weights[units] ?? weights.metric
}

// Working in hundredths keeps 1.25 and 2.5 exact (0.1 + 0.2 style float errors would
// otherwise make 61.25 kg "not reachable").
const toCents = (value) => Math.round(value * 100)

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

// Upper limit for the search, in display units; the form allows 1000 at most.
const MAX_TARGET = 1000

// target: total weight in the display unit; bar: bar weight; plates: available plate
// weights (any order, unlimited pairs of each).
// Returns {
//   status:  "exact"     the target can be loaded exactly
//            "under"     it can't; perSide is the heaviest load below it
//            "belowBar"  the target is lighter than the empty bar
//   perSide: plates for ONE side, heaviest first
//   loaded:  bar + every side
//   missing: target - loaded (0 when exact)
// }
// Plain greedy ("take the heaviest plate that fits") fails with some plate sets: with
// only 15s and 10s, 20 a side is 10 + 10, not 15 + nothing. So this is a small
// unbounded-knapsack DP over the per-side weight: the reachable weight closest to the
// target, then the fewest plates, then the heaviest plates first.
// sides: 2 for a bar or a machine with two sleeves, 1 for a landmine (all plates on one end).
export function loadBar(target, { bar, plates, sides = 2 }) {
  const total = Number(target)
  const barKg = Number(bar)
  const sideCount = sides === 1 ? 1 : 2
  if (!Number.isFinite(total) || !Number.isFinite(barKg) || total < barKg) {
    return { status: "belowBar", perSide: [], loaded: barKg, missing: 0 }
  }

  const available = [...new Set(plates.map(Number).filter((p) => Number.isFinite(p) && p > 0))]
    .map(toCents)
    .sort((a, b) => b - a)
  const sideCents = Math.floor((toCents(Math.min(total, MAX_TARGET)) - toCents(barKg)) / sideCount)

  let perSideCents = []
  if (available.length > 0 && sideCents > 0) {
    // Every reachable weight is a multiple of the plates' gcd, so count in those units.
    const unit = available.reduce(gcd)
    const plateUnits = available.map((p) => p / unit)
    const size = Math.floor(sideCents / unit)

    // fewest[w] = fewest plates that make exactly w units (Infinity = unreachable).
    const fewest = new Array(size + 1).fill(Infinity)
    fewest[0] = 0
    for (let w = 1; w <= size; w++) {
      for (const p of plateUnits) {
        if (p <= w && fewest[w - p] + 1 < fewest[w]) fewest[w] = fewest[w - p] + 1
      }
    }

    let best = size
    while (fewest[best] === Infinity) best--

    // Walk back, always taking the heaviest plate that keeps the count minimal.
    for (let w = best; w > 0; ) {
      const p = plateUnits.find((q) => q <= w && fewest[w - q] === fewest[w] - 1)
      perSideCents.push(p * unit)
      w -= p
    }
    perSideCents.sort((a, b) => b - a)
  }

  const perSide = perSideCents.map((c) => c / 100)
  const loadedCents = toCents(barKg) + sideCount * perSideCents.reduce((sum, c) => sum + c, 0)
  const missingCents = toCents(total) - loadedCents
  return {
    status: missingCents === 0 ? "exact" : "under",
    perSide,
    loaded: loadedCents / 100,
    missing: missingCents / 100,
  }
}
