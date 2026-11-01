// src/components/StatsSummary.jsx
import { summarize } from "../lib/stats"
import { formatWeight } from "../lib/preferences"

function StatsSummary({ workouts, units, source, onSourceChange, filtersActive }) {
  const hint = source === "filtered" && !filtersActive ? "Žádný filtr není nastavený, počítá se ze všech tréninků." : ""
  const { totalWorkouts, totalVolume, volumeLast7Days, avgVolumePerWorkout } = summarize(workouts)
  const weight = (kg) => formatWeight(kg, units, { decimals: 0, locale: "cs-CZ" })

  const tiles = [
    { label: "Objem za 7 dní", value: weight(volumeLast7Days), featured: true },
    { label: "Tréninky", value: totalWorkouts },
    { label: "Celkový objem", value: weight(totalVolume) },
    { label: "Ø objem / trénink", value: weight(avgVolumePerWorkout) },
  ]

  return (
    <section className="stats-summary" aria-label="Souhrn">
      <div className="section-bar">
        <h2 className="section-title">
          Souhrn {hint && <span className="muted small section-hint">· {hint}</span>}
        </h2>
        <div className="segmented segmented-small" role="radiogroup" aria-label="Statistiky počítat z">
          {[
            { value: "all", label: "Vše" },
            { value: "filtered", label: "Podle filtru" },
          ].map((opt) => (
            <label key={opt.value} className="segmented-option">
              <input
                type="radio"
                name="stats-source"
                value={opt.value}
                checked={source === opt.value}
                onChange={() => onSourceChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        {tiles.map((t) => (
          <div key={t.label} className={`kpi ${t.featured ? "kpi-featured" : ""}`}>
            <div className="kpi-label">{t.label}</div>
            <div className="kpi-value">{t.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default StatsSummary
