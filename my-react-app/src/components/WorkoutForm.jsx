// src/components/WorkoutForm.jsx
import { useId, useState } from "react"
import { exercises as exercisesDb } from "../data/exercises.js"
import DatePicker from "./DatePicker.jsx"
import NumberStepper from "./NumberStepper"
import RestTimer from "./RestTimer"
import Icon from "./Icon"
import { WORKOUT_TYPES } from "../lib/workoutTypes"
import { formatWeight, fromDisplayWeight, toDisplayWeight, weightUnit } from "../lib/preferences"
import { lastPerformance } from "../lib/history"
import { parseRepRange, suggestProgression, WEIGHT_STEP } from "../lib/progression"
import { DEFAULT_REST_SECONDS } from "../lib/restTimer"
import { formatWorkoutDate } from "../lib/format"

const DEFAULT_WEIGHT = { metric: 60, imperial: 135 }
const MAX_SETS_REPS = 100
const MAX_WEIGHT = 1000

const isWholeNumberInRange = (value, min, max) => {
  const n = Number(value)
  return value !== "" && Number.isInteger(n) && n >= min && n <= max
}

// Returns an error message for the "add exercise" fields, or "" when they are valid.
// The inputs' min/step attributes aren't enforced, because "Přidat cvik" isn't a submit button.
function exerciseError({ name, sets, reps, weight, unit }) {
  if (!name) return "Vyber nebo zadej název cviku."
  if (!isWholeNumberInRange(sets, 1, MAX_SETS_REPS)) return `Série musí být celé číslo od 1 do ${MAX_SETS_REPS}.`
  if (!isWholeNumberInRange(reps, 1, MAX_SETS_REPS)) return `Opakování musí být celé číslo od 1 do ${MAX_SETS_REPS}.`
  const w = Number(weight)
  if (weight === "" || !Number.isFinite(w) || w < 0 || w > MAX_WEIGHT) {
    return `Váha musí být číslo od 0 do ${MAX_WEIGHT} ${unit} (0 = vlastní váha).`
  }
  return ""
}

// The initial* props are only read on mount. To load a different workout,
// the parent remounts the form with a new `key` instead of syncing state in an effect.
// Weights are typed in the chosen unit but always stored in kg.
// saveError: message from the parent when saving failed; the form stays filled in.
// history: the user's other workouts, for the "Minule" (last time) hint and prefill.
// repRange: "6-10" etc., for the progressive overload suggestion.
// plannedExercises: names to offer as one-tap choices ("Dnešní cviky"), e.g. from today's plan.
// restTimer: from useRestTimer() in the parent, so it keeps running when the dialog closes.
// restSeconds: started automatically after adding an exercise; null = don't.
function WorkoutForm({
  initialDate,
  initialType,
  initialExercises,
  initialNote,
  units = "metric",
  onSave,
  onCancel,
  isEditing,
  saveError = "",
  history = [],
  repRange = "6-10",
  plannedExercises = [],
  restTimer = null,
  restSeconds = null,
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
  const [error, setError] = useState("")

  const resetExerciseForm = () => {
    setExerciseName("")
    setCustomExerciseName("")
    setUseCustomExercise(false)
    setSets(3)
    setReps(10)
    setWeight(DEFAULT_WEIGHT[units] ?? 60)
  }

  const formatEntry = (entry) =>
    `${entry.sets}×${entry.reps}` + (entry.weight > 0 ? ` · ${formatWeight(entry.weight, units, { locale: "cs-CZ" })}` : "")

  // Last time's numbers for the chosen exercise; workouts after this one's date don't count.
  const findLast = (name) => lastPerformance(history, name, { onOrBefore: date })
  const currentName = useCustomExercise ? customExerciseName.trim() : exerciseName
  const last = findLast(currentName)

  // Next step from the first entry of last time (usually the working sets).
  const suggestion = last ? suggestProgression(last.entries[0], { repRange, units }) : null
  const suggestionReason = {
    reps: "+1 opakování",
    weight: `horní hranice ${parseRepRange(repRange).join("–")} → přidej váhu`,
    bodyweight: "+1 opakování",
  }[suggestion?.reason]

  const fillIn = (entry) => {
    setSets(entry.sets || 1)
    setReps(entry.reps || 1)
    setWeight(toDisplayWeight(entry.weight, units))
  }

  // Fills in the first entry from last time (usually the working sets).
  const applyLast = (performance) => fillIn(performance.entries[0])

  const handleExerciseSelect = (name) => {
    setExerciseName(name)
    const performance = findLast(name)
    if (performance) applyLast(performance)
  }

  const handleAddExercise = (e) => {
    e.preventDefault()

    const finalName = useCustomExercise ? customExerciseName.trim() : exerciseName
    const message = exerciseError({ name: finalName, sets, reps, weight, unit })
    setError(message)
    if (message) return

    const newExercise = {
      id: Date.now() + Math.random(),
      name: finalName,
      sets: Number(sets),
      reps: Number(reps),
      weight: fromDisplayWeight(weight, units),
    }

    setExercises((prev) => [...prev, newExercise])
    resetExerciseForm()
    if (restTimer && restSeconds) restTimer.start(restSeconds)
  }

  const handleRemoveExercise = (exerciseId) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const message = !date ? "Vyber datum tréninku." : exercises.length === 0 ? "Přidej aspoň jeden cvik." : ""
    setError(message)
    if (message) return

    onSave({
      date,
      type,
      exercises,
      note,
    })
  }

  const filteredExercises = exercisesDb[type] || []
  const isLogged = (name) => exercises.some((ex) => ex.name.toLowerCase() === name.toLowerCase())

  // Picks a planned exercise: from the list when it's there, otherwise as a
  // custom name. Either way last time's numbers are filled in.
  const handlePlannedPick = (name) => {
    setError("")
    if (filteredExercises.includes(name)) {
      setUseCustomExercise(false)
      handleExerciseSelect(name)
      return
    }
    setUseCustomExercise(true)
    setCustomExerciseName(name)
    const performance = findLast(name)
    if (performance) applyLast(performance)
  }
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

          {plannedExercises.length > 0 && (
            <div className="planned" role="group" aria-labelledby={`${id}-planned`}>
              <span id={`${id}-planned`} className="label">
                Dnešní cviky
              </span>
              <div className="planned-list">
                {plannedExercises.map((name) => {
                  const done = isLogged(name)
                  const selected = currentName.toLowerCase() === name.toLowerCase()
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`chip ${done ? "is-done" : ""} ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      aria-label={done ? `${name} (přidáno)` : name}
                      onClick={() => handlePlannedPick(name)}
                    >
                      {done && <span aria-hidden="true">✓ </span>}
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
                onChange={(e) => handleExerciseSelect(e.target.value)}
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

          {last && (
            <div className="last-time" aria-live="polite">
              <p className="last-time-row">
                <span>
                  <span className="last-time-label">Minule ({formatWorkoutDate(last.date)}):</span>{" "}
                  {last.entries.map(formatEntry).join(", ")}
                </span>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => applyLast(last)}>
                  Použít
                </button>
              </p>
              {suggestion && (
                <p className="last-time-row">
                  <span>
                    <span className="last-time-label">Návrh:</span> {formatEntry(suggestion)}{" "}
                    <span className="muted">({suggestionReason})</span>
                  </span>
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => fillIn(suggestion)}>
                    Použít návrh
                  </button>
                </p>
              )}
            </div>
          )}

          <div className="form-row form-row-3">
            <NumberStepper id={`${id}-sets`} label="Série" value={sets} onChange={setSets} min={1} />
            <NumberStepper id={`${id}-reps`} label="Opakování" value={reps} onChange={setReps} min={1} />
            <NumberStepper
              id={`${id}-weight`}
              label={`Váha (${unit})`}
              value={weight}
              onChange={setWeight}
              step={WEIGHT_STEP[units] ?? 2.5}
              inputMode="decimal"
            />
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

      {(error || saveError) && (
        <p className="alert alert-error dialog-error" role="alert">
          {error || saveError}
        </p>
      )}

      <footer className="dialog-footer">
        {restTimer && (
          <div className="dialog-footer-start">
            <RestTimer timer={restTimer} defaultSeconds={restSeconds ?? DEFAULT_REST_SECONDS} />
          </div>
        )}
        {/* Hidden on phones, where the × in the header does the same and the row is needed for the timer. */}
        <button type="button" className="btn btn-ghost dialog-cancel" onClick={onCancel}>
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
