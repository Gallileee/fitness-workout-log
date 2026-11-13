// src/components/PlateLoad.jsx
// Shows which plates go on each side of the bar for the weight in the form,
// as text (read by screen readers) and as a small drawing of one sleeve.
import { barWeight, loadBar } from "../lib/plates"

const formatNumber = (value) => value.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })

// weight: number typed in the form, in the display unit. bar: "standard" | "light" | "technique".
// plates: available plate weights in the display unit.
function PlateLoad({ weight, units = "metric", bar = "standard", plates = [] }) {
  const unit = units === "imperial" ? "lb" : "kg"
  const target = Number(weight)
  if (weight === "" || !Number.isFinite(target) || target <= 0) return null

  const barTotal = barWeight(bar, units)
  const result = loadBar(target, { bar: barTotal, plates })
  const barText = `osa ${formatNumber(barTotal)} ${unit}`

  let text
  if (result.status === "belowBar") {
    text = `Lehčí než prázdná osa (${formatNumber(barTotal)} ${unit}).`
  } else if (result.perSide.length === 0 && result.status === "exact") {
    text = `Jen prázdná osa (${formatNumber(barTotal)} ${unit}).`
  } else {
    const side = result.perSide.length > 0 ? result.perSide.map(formatNumber).join(" + ") : "nic"
    text = `Na každou stranu: ${side} ${unit} (${barText})`
    if (result.status === "under") {
      text += ` – přesně to nejde, naloženo ${formatNumber(result.loaded)} ${unit}, o ${formatNumber(result.missing)} ${unit} méně.`
    } else {
      text += "."
    }
  }

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
    </div>
  )
}

export default PlateLoad
