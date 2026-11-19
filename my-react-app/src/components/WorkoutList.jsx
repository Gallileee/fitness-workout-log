// src/components/WorkoutList.jsx
import { useEffect, useRef, useState } from "react"
import Icon from "./Icon"
import { workoutVolume } from "../lib/stats"
import { formatWeight } from "../lib/preferences"
import { formatWorkoutDate } from "../lib/format"
import { workoutTypeLabel } from "../lib/workoutTypes"

// onDelete(id) may return a promise: the card shows "Mažu…" until it settles, and if it
// rejects, the error message stays in the card (the workout is still there).
function WorkoutList({ workouts, units, onEdit, onDelete, emptyText = "Zatím žádné tréninky." }) {
  const list = Array.isArray(workouts) ? workouts : []
  const weight = (kg, decimals = 1) => formatWeight(kg, units, { decimals, locale: "cs-CZ" })

  // Deleting is two steps inside the card: the trash button asks, "Smazat" deletes.
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [errors, setErrors] = useState({})
  const cancelRef = useRef(null)
  const trashRefs = useRef(new Map())
  const returnFocusTo = useRef(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Focus "Zrušit" when asking (the safe choice), and the trash button again after cancelling
  // or after a failed delete (once it is enabled again).
  useEffect(() => {
    if (confirmId != null) {
      cancelRef.current?.focus()
    } else if (busyId == null && returnFocusTo.current != null) {
      trashRefs.current.get(returnFocusTo.current)?.focus()
      returnFocusTo.current = null
    }
  }, [confirmId, busyId])

  const ask = (id) => {
    setErrors((prev) => withoutKey(prev, id))
    setConfirmId(id)
  }

  const cancel = () => {
    returnFocusTo.current = confirmId
    setConfirmId(null)
  }

  const confirmDelete = async (id) => {
    setConfirmId(null)
    setBusyId(id)
    try {
      await onDelete(id)
    } catch (err) {
      if (mounted.current) {
        setErrors((prev) => ({ ...prev, [id]: `Nepovedlo se smazat trénink: ${err?.message || "neznámá chyba"}` }))
        returnFocusTo.current = id
      }
    } finally {
      if (mounted.current) setBusyId((current) => (current === id ? null : current))
    }
  }

  if (list.length === 0) {
    return <p className="empty">{emptyText}</p>
  }

  return (
    <ul className="workout-list">
      {list.map((w) => {
        const asking = confirmId === w.id
        const busy = busyId === w.id
        return (
          <li key={w.id} className={`workout-card${asking || busy ? " is-deleting" : ""}`}>
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
                  disabled={busy}
                >
                  <Icon name="edit" size={18} />
                </button>
                <button
                  ref={(el) => {
                    if (el) trashRefs.current.set(w.id, el)
                    else trashRefs.current.delete(w.id)
                  }}
                  className="icon-btn icon-btn-danger"
                  type="button"
                  onClick={() => ask(w.id)}
                  aria-label={`Smazat trénink ${w.date || ""}`}
                  aria-expanded={asking}
                  title="Smazat"
                  disabled={busy || asking}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </div>

            {asking && (
              <div
                className="delete-confirm"
                role="group"
                aria-label="Potvrzení smazání"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation()
                    cancel()
                  }
                }}
              >
                <span className="delete-confirm-text">Smazat celý trénink? Nejde to vrátit.</span>
                <div className="delete-confirm-actions">
                  <button ref={cancelRef} className="btn btn-ghost btn-small" type="button" onClick={cancel}>
                    Zrušit
                  </button>
                  <button className="btn btn-danger btn-small" type="button" onClick={() => confirmDelete(w.id)}>
                    Smazat
                  </button>
                </div>
              </div>
            )}

            {busy && (
              <p className="muted small" role="status">
                Mažu…
              </p>
            )}

            {errors[w.id] && (
              <p className="alert alert-error workout-error" role="alert">
                {errors[w.id]}
              </p>
            )}

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
        )
      })}
    </ul>
  )
}

function withoutKey(obj, key) {
  if (!(key in obj)) return obj
  const next = { ...obj }
  delete next[key]
  return next
}

export default WorkoutList
