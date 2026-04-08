// src/components/WorkoutForm.jsx
import { useState, useEffect } from "react"
import { exercises as exercisesDb } from "../data/exercises.js"
import DatePicker from "./DatePicker.jsx"





function WorkoutForm({
  initialDate,
  initialType,
  initialExercises,
  initialNote,
  onSave,
  onCancel,
  isEditing,
}) {
  const [date, setDate] = useState(initialDate || "")
  const [type, setType] = useState(initialType || "push")
  const [exercises, setExercises] = useState(initialExercises || [])

  const [exerciseName, setExerciseName] = useState("")
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(60)

  const [useCustomExercise, setUseCustomExercise] = useState(false)
  const [customExerciseName, setCustomExerciseName] = useState("")

  const [note, setNote] = useState(initialNote || "")

  useEffect(() => {
    setDate(initialDate || "")
    setType(initialType || "push")
    setExercises(initialExercises || [])
    setNote(initialNote || "")
  }, [initialDate, initialType, initialExercises, initialNote])

  const resetExerciseForm = () => {
    setExerciseName("")
    setCustomExerciseName("")
    setUseCustomExercise(false)
    setSets(3)
    setReps(10)
    setWeight(60)
  }

  const handleAddExercise = (e) => {
    e.preventDefault()

    const finalName = useCustomExercise
      ? customExerciseName.trim()
      : exerciseName

    if (!finalName) {
      alert("Vyber nebo zadej název cviku")
      return
    }

    const newExercise = {
      id: Date.now() + Math.random(),
      name: finalName,
      sets: Number(sets),
      reps: Number(reps),
      weight: Number(weight),
    }

    setExercises((prev) => [...prev, newExercise])
    resetExerciseForm()
  }

  const handleRemoveExercise = (id) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id))
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

  return (
    <div className="card">
      <h2>{isEditing ? "Upravit trénink" : "Nový trénink"}</h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 550 }}>
        

        <div className="field" style={{ maxWidth: 505 }}>
          <DatePicker
            label="Datum"
            value={date}
            onChange={setDate}
            placeholder="dd. mm. rr"
          />
        </div>

        <div className="field">
          <label className="label">
            Typ tréninku
          </label>
          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="fullbody">Full body</option>
            <option value="push">Push</option>
            <option value="pull">Pull</option>
            <option value="legs">Legs</option>
            <option value="core">Core</option>
            <option value="other">Other</option>
          </select>
        </div>

        <h2 style={{ marginTop: 20, marginBottom: 8 }}>Cviky v tréninku</h2>

        <div className="field" style={{ marginBottom: 8 }}>
          <label className="label">
            Způsob zadání cviku
          </label>
          <label style={{ fontSize: 14 }}>
            <input
              type="checkbox"
              checked={useCustomExercise}
              onChange={(e) => setUseCustomExercise(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Použít vlastní název cviku
          </label>
        </div>

        <div className="input-row">
          {useCustomExercise ? (
            <input
              className="input"
              type="text"
              placeholder="Vlastní název cviku"
              value={customExerciseName}
              onChange={(e) => setCustomExerciseName(e.target.value)}
            />
          ) : (
            <select
              className="input"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
            >
              <option value="">Vyber cvik...</option>
              {filteredExercises.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}

          <input
            className="input input-small"
            type="number"
            min="1"
            placeholder="Série"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
          />
          <input
            className="input input-small"
            type="number"
            min="1"
            placeholder="Opakování"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
          <input
            className="input input-small"
            type="number"
            min="0"
            placeholder="Váha (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button className="btn btn-outline" onClick={handleAddExercise}>
            Přidat cvik
          </button>
        </div>

        {exercises.length === 0 ? (
          <p>Zatím žádný cvik.</p>
        ) : (
          <ul className="exercise-list">
            {exercises.map((ex) => (
              <li key={ex.id}>
                <strong>{ex.name}</strong>{" "}
                — {ex.sets}×{ex.reps} @ {ex.weight} kg{" "}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: "2px 8px", fontSize: 12 }}
                  onClick={() => handleRemoveExercise(ex.id)}
                >
                  Smazat
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="field" style={{ marginTop: 16, marginRight: 20 }}>
          <label className="label">
            Poznámka k tréninku
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder="Jak ses cítil, RPE, poznámky k výkonu…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary">
            {isEditing ? "Uložit změny" : "Uložit trénink"}
          </button>
          {isEditing && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
            >
              Zrušit úpravu
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default WorkoutForm
