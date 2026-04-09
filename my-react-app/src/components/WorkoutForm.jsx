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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 12, position: "relative" }}>
        <h2 style={{ margin: 0 }}>{isEditing ? "Upravit trénink" : "Nový trénink"}</h2>

        <button
          type="button"
          className="btn btn-outline btn-small"
          onClick={onCancel}
          style={{ position: "absolute", right: 0 }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 550, paddingLeft: 0 }}>
        
        {/* Title for Date & Type section */}
        <label style={{ fontSize: "14px", fontWeight: 500, color: "#9ca3af", marginBottom: "-8px" }}>
          Info
        </label>

        {/* Date and Type side by side */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <DatePicker
              label="Datum"
              value={date}
              onChange={setDate}
              placeholder="dd. mm. rr"
            />
          </div>

          <div className="field" style={{ flex: 1, minWidth: 200 }}>
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
        </div>

        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Cviky v tréninku</h2>

        {/* Left: Exercise input options, Right: Exercise list */}
        <div style={{ display: "flex", gap: 12, minHeight: 220 }}>
          {/* LEFT SIDE: Input Options */}
          <div style={{ flex: 1, minWidth: 220 }}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                className="input"
                type="number"
                min="1"
                placeholder="Série"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
              />
              <input
                className="input"
                type="number"
                min="1"
                placeholder="Opakování"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
              <input
                className="input"
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
          </div>

          {/* RIGHT SIDE: Exercise List */}
          <div style={{ flex: 1, minWidth: 400, borderLeft: "1px solid #1f2937", paddingLeft: 12, maxHeight: 400, overflowY: "auto", paddingRight: 6 }}>
            {exercises.length === 0 ? (
              <p style={{ fontSize: 14, color: "#9ca3af" }}>Zatím žádný cvik.</p>
            ) : (
              <ul className="exercise-list" style={{ margin: 0, padding: 0 }}>
                {exercises.map((ex) => (
                  <li key={ex.id} style={{ fontSize: 13, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #1f2937" }}>
                    <div>
                      <strong>{ex.name}</strong> — {ex.sets}×{ex.reps} @ {ex.weight} kg
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      style={{ marginTop: 6, fontSize: 11 }}
                      onClick={() => handleRemoveExercise(ex.id)}
                    >
                      Smazat
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

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
