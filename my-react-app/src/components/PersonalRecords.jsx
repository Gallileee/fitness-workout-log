// src/components/PersonalRecords.jsx
import { personalRecords, MAX_REPS_FOR_1RM } from "../lib/stats"

const MAX_ROWS = 8

function PersonalRecords({ workouts }) {
  // Strongest lifts first, so the most relevant records stay visible.
  const records = personalRecords(workouts)
    .sort((a, b) => (b.bestE1rm ?? b.bestWeight) - (a.bestE1rm ?? a.bestWeight))
    .slice(0, MAX_ROWS)

  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #1f2937", paddingTop: "20px", paddingBottom: 20 }}>
      <h3 style={{ fontSize: "16px", margin: "0 0 6px 0", fontWeight: 600, color: "#9ca3af" }}>
        Osobní rekordy
      </h3>

      {records.length === 0 ? (
        <p>Zatím žádné cviky se zátěží.</p>
      ) : (
        <table className="records-table">
          <thead>
            <tr>
              <th>Cvik</th>
              <th>Max váha</th>
              <th title={`Epley: váha × (1 + opakování / 30), jen série do ${MAX_REPS_FOR_1RM} opakování`}>
                Odhad 1RM
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td title={r.bestWeightDate || ""}>{r.bestWeight} kg</td>
                <td title={r.bestE1rmDate || ""}>{r.bestE1rm === null ? "–" : `${r.bestE1rm} kg`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default PersonalRecords
