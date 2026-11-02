// src/components/TodayCard.jsx
// "Dnes" on the mobile overview: today's planned type and everything already
// logged today, so mid-workout you can see what's done at a glance.
// New exercises are added with the + button, which starts today's workout.
import { workoutTypeLabel } from "../lib/workoutTypes"
import { formatWeight } from "../lib/preferences"

function TodayCard({ today, workouts, units, onEdit }) {
  const planned = today.type === "off" ? "Volno" : workoutTypeLabel(today.type)
  const entry = (ex) =>
    `${ex.sets}×${ex.reps}` + (Number(ex.weight) > 0 ? ` · ${formatWeight(ex.weight, units, { locale: "cs-CZ" })}` : "")

  return (
    <section className="card today-card" aria-labelledby="today-title">
      <div className="card-head">
        <h2 id="today-title" className="card-title">
          Dnes
        </h2>
        <span className={`pill pill-${today.type === "off" ? "other" : today.type}`}>Plán: {planned}</span>
      </div>

      {workouts.length === 0 ? (
        <p className="muted today-text">Zatím nic zapsaného. Trénink začneš tlačítkem{"\u00a0"}+.</p>
      ) : (
        workouts.map((w) => (
          <div key={w.id} className="today-workout">
            <ul className="today-exercises">
              {(w.exercises || []).map((ex, i) => (
                <li key={ex.id ?? i}>
                  <span className="today-exercise-name">{ex.name}</span>
                  <span className="today-exercise-sets">{entry(ex)}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => onEdit(w.id)}>
              Upravit
            </button>
          </div>
        ))
      )}
    </section>
  )
}

export default TodayCard
