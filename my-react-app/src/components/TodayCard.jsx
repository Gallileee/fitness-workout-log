// src/components/TodayCard.jsx
// "Dnes" on the mobile overview: today's planned type and everything already
// logged today, so mid-workout you can see what's done at a glance.
// Before anything is logged it is the start of the workout: last time's exercises
// of today's type and a button that opens the form for them (the same as +).
import { workoutTypeLabel } from "../lib/workoutTypes"
import { formatWeight } from "../lib/preferences"
import { formatWorkoutDate } from "../lib/format"

function TodayCard({ today, workouts, units, onEdit, onStart }) {
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
        <TodayStart today={today} planned={planned} onStart={onStart} />
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

function TodayStart({ today, planned, onStart }) {
  if (today.type === "off") {
    return (
      <>
        <p className="muted today-text">Dnes je v plánu volno.</p>
        <button type="button" className="btn btn-secondary today-start" onClick={onStart}>
          Zapsat trénink
        </button>
      </>
    )
  }

  const names = today.exerciseNames ?? []
  return (
    <>
      {names.length > 0 ? (
        <div className="today-last">
          <div className="today-last-label">Minule ({formatWorkoutDate(today.sourceDate)})</div>
          <ul className="today-last-list">
            {names.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted today-text">Zatím žádný předchozí trénink tohoto typu.</p>
      )}
      <button type="button" className="btn btn-primary today-start" onClick={onStart}>
        Začít {planned}
      </button>
    </>
  )
}

export default TodayCard
