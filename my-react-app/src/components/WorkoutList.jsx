// src/components/WorkoutList.jsx

function WorkoutList({ workouts, onEdit, onDelete }) {
  return (
    <div className="card">
      <h2>Uložené tréninky</h2>
      {workouts.length === 0 && <p>Zatím žádné tréninky.</p>}

      {workouts.map((w) => (
  <div key={w.id} className="workout-card">
    <div className="workout-header">
      <span>
        {w.date} – {w.type}
      </span>
      <span className="chip">
        {w.exercises?.length || 0} cviků
      </span>
    </div>
    <ul className="exercise-list">
      {(w.exercises || []).map((ex) => (
        <li key={ex.id}>
          <strong>{ex.name}</strong>{" "}
          — {ex.sets}×{ex.reps} @ {ex.weight} kg
        </li>
      ))}
    </ul>

    {w.note && (
      <p style={{ marginTop: 8, fontSize: 14, color: "#9ca3af" }}>
        Poznámka: {w.note}
      </p>
    )}

    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
      <button className="btn btn-outline" onClick={() => onEdit(w.id)}>
        Upravit
      </button>
      <button className="btn btn-danger" onClick={() => onDelete(w.id)}>
        Smazat
      </button>
    </div>
  </div>
))}
    </div>
  )
}

export default WorkoutList
