// src/components/ProgressChart.jsx
import { useId, useState } from "react"
import { personalRecords, oneRepMaxHistory } from "../lib/stats"
import { scaleSeries } from "../lib/chart"
import { toDisplayWeight, weightUnit } from "../lib/preferences"
import { formatWorkoutDate } from "../lib/format"
import { useElementSize } from "../lib/useElementSize"

// The SVG is drawn in real pixels of its box (measured), so it always fills
// the card width and dots stay round at any size.
const FALLBACK_SIZE = { width: 480, height: 150 }
const PADDING = 12
// Left gutter for the axis labels (the highest and lowest value), in pixels.
const AXIS_WIDTH = 40

const axisNumber = (value) => value.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })

function ProgressChart({ workouts, units }) {
  const gradientId = useId()
  const [svgRef, { width: WIDTH, height: HEIGHT }] = useElementSize(FALLBACK_SIZE)
  // Only exercises that have at least one set usable for a 1RM estimate.
  const options = personalRecords(workouts)
    .filter((r) => r.bestE1rm !== null)
    .map((r) => r.name)

  const [selected, setSelected] = useState("")
  // Fall back to the first option when nothing (or a no longer existing exercise) is selected.
  const exercise = options.includes(selected) ? selected : options[0] || ""

  const unit = weightUnit(units)
  const history = oneRepMaxHistory(workouts, exercise).map((h) => ({
    date: h.date,
    value: toDisplayWeight(h.e1rm, units),
  }))
  const scaled = scaleSeries(
    history.map((h) => h.value),
    { width: WIDTH - AXIS_WIDTH, height: HEIGHT, padding: PADDING }
  )
  const { min, max } = scaled
  const points = scaled.points.map((p) => ({ x: p.x + AXIS_WIDTH, y: p.y }))
  // Max at the top, min at the bottom; a flat series has one value, in the middle.
  const axis =
    min === null ? [] : max === min ? [{ value: min, y: HEIGHT / 2 }] : [
      { value: max, y: PADDING },
      { value: min, y: HEIGHT - PADDING },
    ]

  const first = history[0]
  const last = history[history.length - 1]
  const change = history.length > 1 ? Math.round((last.value - first.value) * 10) / 10 : null

  if (options.length === 0) {
    return <p className="empty">Zatím žádné série, ze kterých jde odhadnout 1RM.</p>
  }

  const line = points.map((p) => `${p.x},${p.y}`).join(" ")
  const area =
    points.length > 1 ? `${AXIS_WIDTH + PADDING},${HEIGHT} ${line} ${WIDTH - PADDING},${HEIGHT}` : ""

  return (
    <div className="progress">
      <div className="progress-head">
        <label className="visually-hidden" htmlFor={`${gradientId}-exercise`}>
          Cvik pro graf
        </label>
        <select
          id={`${gradientId}-exercise`}
          className="input input-select"
          value={exercise}
          onChange={(e) => setSelected(e.target.value)}
        >
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {last && (
          <div className="progress-current">
            <span className="progress-value">
              {last.value} {unit}
            </span>
            {change !== null && (
              <span className={`delta ${change >= 0 ? "delta-up" : "delta-down"}`}>
                {change > 0 ? "+" : ""}
                {change} {unit}
              </span>
            )}
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        className="progress-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Odhad 1RM pro ${exercise}: ${history.map((h) => `${h.date} ${h.value} ${unit}`).join(", ")}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {axis.map((a) => (
          <g key={a.y} className="progress-axis" aria-hidden="true">
            <line x1={AXIS_WIDTH} x2={WIDTH} y1={a.y} y2={a.y} />
            <text x={AXIS_WIDTH - 8} y={a.y} dominantBaseline="middle" textAnchor="end">
              {axisNumber(a.value)}
            </text>
          </g>
        ))}
        {area && <polygon points={area} fill={`url(#${gradientId})`} />}
        {points.length > 1 && (
          <polyline fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" points={line} />
        )}
        {points.map((p, i) => (
          <circle key={history[i].date} cx={p.x} cy={p.y} r="3.25" className="progress-dot">
            <title>{`${formatWorkoutDate(history[i].date, { withYear: true })}: ${history[i].value} ${unit}`}</title>
          </circle>
        ))}
      </svg>

      <p className="progress-caption">
        {history.length} {workoutsWord(history.length)} · osa v {unit}
        {first && history.length > 1 && ` · od ${formatWorkoutDate(first.date, { withYear: true })}`}
      </p>
    </div>
  )
}

function workoutsWord(n) {
  if (n === 1) return "trénink"
  if (n >= 2 && n <= 4) return "tréninky"
  return "tréninků"
}

export default ProgressChart
