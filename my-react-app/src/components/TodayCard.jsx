// src/components/TodayCard.jsx
// Today's planned workout with a Start button (mobile overview).
// `today` comes from todaysWorkout() in src/lib/todaysWorkout.js.
import Icon from "./Icon"
import { workoutTypeLabel } from "../lib/workoutTypes"
import { formatWorkoutDate } from "../lib/format"
import { exercisesLabel } from "../lib/todaysWorkout"

function TodayCard({ today, onStart }) {
  const label = workoutTypeLabel(today.type)

  if (today.type === "off") {
    return (
      <section className="card today-card" aria-label="Dnešní trénink">
        <p className="muted small today-text">Dnes je v plánu volno.</p>
      </section>
    )
  }

  if (today.done) {
    return (
      <section className="card today-card" aria-label="Dnešní trénink">
        <p className="small today-text">
          <span className="today-check" aria-hidden="true">
            ✓
          </span>{" "}
          Dnešní trénink ({label}) je zapsaný.
        </p>
      </section>
    )
  }

  const count = today.exerciseNames.length
  return (
    <section className="card card-featured today-card" aria-label="Dnešní trénink">
      <div className="today-body">
        <h2 className="card-title">Dnes: {label}</h2>
        <p className="muted small today-text">
          {count
            ? `${exercisesLabel(count)} jako ${formatWorkoutDate(today.sourceDate)}`
            : `Zatím žádný ${label} trénink, začneš od nuly.`}
        </p>
      </div>
      <button type="button" className="btn btn-primary" onClick={onStart}>
        <Icon name="plus" size={18} />
        Začít
      </button>
    </section>
  )
}

export default TodayCard
