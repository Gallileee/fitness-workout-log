// src/components/WorkoutForm.jsx
import { useId, useState } from "react"
import { exercises as exercisesDb } from "../data/exercises.js"
import DatePicker from "./DatePicker.jsx"
import Icon from "./Icon"
import { WORKOUT_TYPES } from "../lib/workoutTypes"
import { formatWeight, fromDisplayWeight, weightUnit } from "../lib/preferences"

const DEFAULT_WEIGHT = { metric: 60, imperial: 135 }

// The initial* props are only read on mount. To load a different workout,
// the parent remounts the form with a new `key` instead of syncing state in an effect.
// Weights are typed in the chosen unit but always stored in kg.
function WorkoutForm({
  initialDate,
  initialType,
  initialExercises,
  initialNote,
  units = "metric",
  onSave,
  onCancel,
  isEditing,
}) {
  const id = useId()
  const unit = weightUnit(units)

  const [date, setDate] = useState(initialDate || "")
  const [type, setType] = useState(initialType || "push")
  const [exercises, setExercises] = useState(initialExercises || [])

  const [exerciseName, setExerciseName] = useState("")
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(DEFAULT_WEIGHT[units] ?? 60)

  const [useCustomExercise, setUseCustomExercise] = useState(false)
  const [customExerciseName, setCustomExerciseName] = useState("")

  const [note, setNote] = useState(initialNote || "")

  const resetExerciseForm = () => {
    setExerciseName("")
    setCustomExerciseName("")
    setUseCustomExercise(false)
    setSets(3)
    setReps(10)
    setWeight(DEFAULT_WEIGHT[units] ?? 60)
  }

  const handleAddExercise = (e) => {
    e.preventDefault()

    const finalName = useCustomExercise ? customExerciseName.trim() : exerciseName

    if (!finalName) {
      alert("Vyber nebo zadej název cviku")
      return
    }

    const newExercise = {
      id: Date.now() + Math.random(),
      name: finalName,
      sets: Number(sets),
      reps: Number(reps),
      weight: fromDisplayWeight(weight, units),
    }

    setExercises((prev) => [...prev, newExercise])
    resetExerciseForm()
  }

  const handleRemoveExercise = (exerciseId) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!date) {
      alert("Vyber datum")
      return
    }

    if (exercises.length === 0) {
      alert("Přidej aspoň jeden cvik")
      return
    }

    onSave({
      date,
      type,
      exercises,
      note,
    })
  }

  const filteredExercises = exercisesDb[type] || []
  const title = isEditing ? "Upravit trénink" : "Nový trénink"

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <header className="dialog-header">
        <h2 id={`${id}-title`} className="dialog-title">
          {title}
        </h2>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Zavřít">
          <Icon name="close" />
        </button>
      </header>

      <form id={`${id}-form`} className="dialog-body form" onSubmit={handleSubmit}>
        <div className="form-row">
          <DatePicker label="Datum" value={date} onChange={setDate} required />
          <div className="field">
            <label className="label" htmlFor={`${id}-type`}>
              Typ tréninku
            </label>
            <select
              id={`${id}-type`}
              className="input input-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {WORKOUT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="subcard">
          <legend className="subcard-title">Přidat cvik</legend>

          <label className="check">
            <input
              type="checkbox"
              checked={useCustomExercise}
              onChange={(e) => setUseCustomExercise(e.target.checked)}
            />
            Vlastní název cviku
          </label>

          <div className="field">
            <label className="label" htmlFor={`${id}-exercise`}>
              Cvik
            </label>
            {useCustomExercise ? (
              <input
                id={`${id}-exercise`}
                className="input"
                type="text"
                placeholder="Např. Bulgarian split squat"
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
              />
            ) : (
              <select
                id={`${id}-exercise`}
                className="input input-select"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
              >
                <option value="">Vyber cvik…</option>
                {filteredExercises.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-row form-row-3">
            <div className="field">
              <label className="label" htmlFor={`${id}-sets`}>
                Série
              </label>
              <input
                id={`${id}-sets`}
                className="input"
                type="number"
                inputMode="numeric"
                min="1"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor={`${id}-reps`}>
                Opakování
              </label>
              <input
                id={`${id}-reps`}
                className="input"
                type="number"
                inputMode="numeric"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor={`${id}-weight`}>
                Váha ({unit})
              </label>
              <input
                id={`${id}-weight`}
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <button type="button" className="btn btn-secondary btn-block" onClick={handleAddExercise}>
            <Icon name="plus" size={18} />
            Přidat cvik
          </button>
        </fieldset>

        <section aria-label="Cviky v tréninku">
          <h3 className="subcard-title">Cviky v tréninku ({exercises.length})</h3>
          {exercises.length === 0 ? (
            <p className="empty">Zatím žádný cvik.</p>
          ) : (
            <ul className="form-exercises">
              {exercises.map((ex) => (
                <li key={ex.id}>
                  <div>
                    <div className="exercise-name">{ex.name}</div>
                    <div className="muted small">
                      {ex.sets}×{ex.reps}
                      {Number(ex.weight) > 0 && ` · ${formatWeight(ex.weight, units, { locale: "cs-CZ" })}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => handleRemoveExercise(ex.id)}
                    aria-label={`Odebrat ${ex.name}`}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="field">
          <label className="label" htmlFor={`${id}-note`}>
            Poznámka
          </label>
          <textarea
            id={`${id}-note`}
            className="input"
            rows={3}
            placeholder="Jak ses cítil, RPE, poznámky k výkonu…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </form>

      <footer className="dialog-footer">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Zrušit
        </button>
        <button type="submit" form={`${id}-form`} className="btn btn-primary">
          {isEditing ? "Uložit změny" : "Uložit trénink"}
        </button>
      </footer>
    </div>
  )
}

export default WorkoutForm
