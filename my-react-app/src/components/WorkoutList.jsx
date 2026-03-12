// src/components/WorkoutList.jsx
function WorkoutList({ workouts, onEdit, onDelete }) {
  const list = Array.isArray(workouts) ? workouts : []

  return (
    <div className="card">
      <h2>Uložené tréninky</h2>

      {list.length === 0 ? (
        <p>Zatím žádné tréninky.</p>
      ) : (
        <ul className="workout-list">
          {list.map((w) => (
            <li key={w.id} className="workout-item">
              <div className="workout-header">
                <span>
                  {w.date || "Bez data"} • {w.type || "Bez typu"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => onEdit(w.id)}
                  >
                    Upravit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    onClick={() => onDelete(w.id)}
                  >
                    Smazat
                  </button>
                </div>
              </div>

              {w.note && (
                <p style={{ marginTop: 4, fontSize: 14 }}>
                  Poznámka: {w.note}
                </p>
              )}

              <ul className="exercise-list">
                {(w.exercises || []).map((ex) => (
                  <li key={ex.id} className="exercise-item">
                    {ex.name}: {ex.sets}×{ex.reps} @ {ex.weight} kg
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default WorkoutList
