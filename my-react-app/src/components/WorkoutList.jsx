// src/components/WorkoutList.jsx
function WorkoutList({ workouts, onEdit, onDelete }) {
  const list = Array.isArray(workouts) ? workouts : []

  return (
    <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: "20px", marginTop: "0px", maxHeight: screen.height - 400, overflowY: "auto" }}>
      <h2>Uložené tréninky</h2>

      {list.length === 0 ? (
        <p>Zatím žádné tréninky.</p>
      ) : ( 
        <div className="workout-list-scroll">
          <ul className="workout-list">
            {list.map((w) => (
              <li key={w.id} className="workout-card">
              <div className="workout-header">
                <span>
                  {w.date || "Bez data"} • {w.type || "Bez typu"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => onEdit(w.id)}
                  >
                    Upravit
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => onDelete(w.id)}
                  >
                    Smazat
                  </button>
                </div>
              </div>

              {w.note && (
                <p
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "#9ca3af",
                  }}
                >
                  Poznámka: {w.note}
                </p>
              )}

              <ul className="exercise-list">
                {(w.exercises || []).map((ex) => (
                  <li key={ex.id}>
                    <strong>{ex.name}</strong> {ex.sets}×{ex.reps} @ {ex.weight}{" "}
                    kg
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      )}
    </div>
    
  )
} 

export default WorkoutList
