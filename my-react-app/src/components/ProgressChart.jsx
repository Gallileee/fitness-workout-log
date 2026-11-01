// src/components/ProgressChart.jsx
import { useState } from "react"
import { personalRecords, oneRepMaxHistory } from "../lib/stats"
import { scaleSeries } from "../lib/chart"

const WIDTH = 320
const HEIGHT = 140
const PADDING = 14

function ProgressChart({ workouts }) {
  // Only exercises that have at least one set usable for a 1RM estimate.
  const options = personalRecords(workouts)
    .filter((r) => r.bestE1rm !== null)
    .map((r) => r.name)

  const [selected, setSelected] = useState("")
  // Fall back to the first option when nothing (or a no longer existing exercise) is selected.
  const exercise = options.includes(selected) ? selected : options[0] || ""

  const history = oneRepMaxHistory(workouts, exercise)
  const { points, min, max } = scaleSeries(
    history.map((h) => h.e1rm),
    { width: WIDTH, height: HEIGHT, padding: PADDING }
  )

  const first = history[0]
  const last = history[history.length - 1]
  const change = history.length > 1 ? Math.round((last.e1rm - first.e1rm) * 10) / 10 : null

  return (
    <div style={{ marginTop: 0, borderTop: "1px solid #1f2937", paddingTop: "20px", paddingBottom: 20 }}>
      <h3 style={{ fontSize: "16px", margin: "0 0 6px 0", fontWeight: 600, color: "#9ca3af" }}>
        Vývoj odhadu 1RM
      </h3>

      {options.length === 0 ? (
        <p>Zatím žádné série, ze kterých jde odhadnout 1RM.</p>
      ) : (
        <>
          <select
            className="select"
            value={exercise}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Cvik pro graf"
          >
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <svg
            className="progress-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Odhad 1RM pro ${exercise}: ${history.map((h) => `${h.date} ${h.e1rm} kg`).join(", ")}`}
          >
            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              />
            )}
            {points.map((p, i) => (
              <circle key={history[i].date} cx={p.x} cy={p.y} r="3.5" fill="currentColor">
                <title>{`${history[i].date}: ${history[i].e1rm} kg`}</title>
              </circle>
            ))}
          </svg>

          <p className="progress-chart-caption">
            {history.length} {history.length === 1 ? "trénink" : "tréninků"} · rozsah {min}–{max} kg
            {change !== null && ` · změna ${change > 0 ? "+" : ""}${change} kg od ${first.date}`}
          </p>
        </>
      )}
    </div>
  )
}

export default ProgressChart
