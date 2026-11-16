// src/components/PlateLoad.jsx
// Shows which plates to load for the weight in the form, as text (read by screen readers)
// and as a small drawing of one sleeve. Works for a barbell, a plate-loaded machine
// (leg press: no bar to count) and a landmine (T-bar row: all plates on one end).
import { useId } from "react"
import { barWeight, loadBar } from "../lib/plates"

const formatNumber = (value) => value.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })

const LOADING_LABELS = {
  barbell: "Osa",
  machine: "Stroj (bez osy)",
  landmine: "Jeden konec",
  none: "Nezobrazovat",
}

// The sentence for a load result, e.g. "Na každou stranu: 25 + 15 kg (osa 20 kg)."
function describeLoad(result, { loading, barTotal, unit }) {
  if (result.status === "belowBar") return `Lehčí než prázdná osa (${formatNumber(barTotal)} ${unit}).`
  if (result.perSide.length === 0 && result.status === "exact") return `Jen prázdná osa (${formatNumber(barTotal)} ${unit}).`

  const where = loading === "landmine" ? "Na jeden konec" : "Na každou stranu"
  const plates = result.perSide.length > 0 ? `${result.perSide.map(formatNumber).join(" + ")} ${unit}` : "nic"
  const what = loading === "barbell" ? `osa ${formatNumber(barTotal)} ${unit}` : "váha stroje se nepočítá"
  let text = `${where}: ${plates} (${what})`
  if (result.status === "under") {
    text += ` – přesně to nejde, naloženo ${formatNumber(result.loaded)} ${unit}, o ${formatNumber(result.missing)} ${unit} méně.`
  } else {
    text += "."
  }
  return text
}

// weight: number typed in the form, in the display unit. bar: "standard" | "light" | "technique".
// plates: available plate weights in the display unit.
// loading: "barbell" | "machine" | "landmine" | "none" (src/lib/plates.js).
// onLoadingChange: when given, a select lets the user change the loading for this exercise.
function PlateLoad({ weight, units = "metric", bar = "standard", plates = [], loading = "barbell", onLoadingChange }) {
  const id = useId()
  const unit = units === "imperial" ? "lb" : "kg"
  const target = Number(weight)
  const hasWeight = weight !== "" && Number.isFinite(target) && target > 0

  const picker = onLoadingChange && (
    <label className="plate-loading-picker" htmlFor={`${id}-loading`}>
      <span className="visually-hidden">Naložení kotoučů</span>
      <select id={`${id}-loading`} className="input input-select" value={loading} onChange={(e) => onLoadingChange(e.target.value)}>
        {Object.entries(LOADING_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )

  if (loading === "none" || !hasWeight) {
    if (!picker) return null
    return (
      <div className="plate-load plate-load-off">
        <p className="plate-load-text">
          <span className="last-time-label">Kotouče:</span> {loading === "none" ? "nezobrazují se." : "zadej váhu."}
        </p>
        {picker}
      </div>
    )
  }

  const barTotal = loading === "barbell" ? barWeight(bar, units) : 0
  const result = loadBar(target, { bar: barTotal, plates, sides: loading === "landmine" ? 1 : 2 })
  const text = describeLoad(result, { loading, barTotal, unit })

  const heaviest = Math.max(...plates, ...result.perSide, 1)
  return (
    <div className={`plate-load plate-load-${result.status}`} aria-live="polite">
      {result.perSide.length > 0 && (
        <div className="plate-sleeve" aria-hidden="true">
          <span className="plate-collar" />
          {result.perSide.map((plate, index) => (
            // Plate height follows its weight, with a floor so small change plates stay visible.
            <span
              key={index}
              className="plate"
              style={{ height: `${Math.max(30, Math.round((Math.sqrt(plate / heaviest)) * 100))}%` }}
              title={`${formatNumber(plate)} ${unit}`}
            >
              {formatNumber(plate)}
            </span>
          ))}
          <span className="plate-sleeve-end" />
        </div>
      )}
      <p className="plate-load-text">
        <span className="last-time-label">Kotouče:</span> {text}
      </p>
      {picker}
    </div>
  )
}

export default PlateLoad
