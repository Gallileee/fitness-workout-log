// src/components/WorkoutList.jsx
import Icon from "./Icon"
import { workoutVolume } from "../lib/stats"
import { formatWeight } from "../lib/preferences"
import { formatWorkoutDate } from "../lib/format"
import { workoutTypeLabel } from "../lib/workoutTypes"

function WorkoutList({ workouts, units, onEdit, onDelete, emptyText = "Zatím žádné tréninky." }) {
  const list = Array.isArray(workouts) ? workouts : []
  const weight = (kg, decimals = 1) => formatWeight(kg, units, { decimals, locale: "cs-CZ" })

  if (list.length === 0) {
    return <p className="empty">{emptyText}</p>
  }

  return (
    <ul className="workout-list">
      {list.map((w) => (
        <li key={w.id} className="workout-card">
          <div className="workout-head">
            <div className="workout-meta">
              <span className="workout-date">{formatWorkoutDate(w.date)}</span>
              <span className={`pill pill-${w.type || "other"}`}>{workoutTypeLabel(w.type)}</span>
            </div>
            <div className="workout-actions">
              <button
                className="icon-btn"
                type="button"
                onClick={() => onEdit(w.id)}
                aria-label={`Upravit trénink ${w.date || ""}`}
                title="Upravit"
              >
                <Icon name="edit" size={18} />
              </button>
              <button
                className="icon-btn icon-btn-danger"
                type="button"
                onClick={() => onDelete(w.id)}
                aria-label={`Smazat trénink ${w.date || ""}`}
                title="Smazat"
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </div>

          <ul className="exercise-list">
            {(w.exercises || []).map((ex) => (
              <li key={ex.id}>
                <span className="exercise-name">{ex.name}</span>
                <span className="exercise-sets">
                  {ex.sets}×{ex.reps}
                  {Number(ex.weight) > 0 && <> · {weight(ex.weight)}</>}
                </span>
              </li>
            ))}
          </ul>

          <div className="workout-foot">
            {w.note ? <p className="workout-note">{w.note}</p> : <span />}
            <span className="workout-volume">{weight(workoutVolume(w), 0)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default WorkoutList
