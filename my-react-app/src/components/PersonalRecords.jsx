// src/components/PersonalRecords.jsx
import { personalRecords, MAX_REPS_FOR_1RM } from "../lib/stats"
import { formatWeight } from "../lib/preferences"

const MAX_ROWS = 8

function PersonalRecords({ workouts, units }) {
  // Strongest lifts first, so the most relevant records stay visible.
  const records = personalRecords(workouts)
    .sort((a, b) => (b.bestE1rm ?? b.bestWeight) - (a.bestE1rm ?? a.bestWeight))
    .slice(0, MAX_ROWS)
  const weight = (kg) => formatWeight(kg, units, { locale: "cs-CZ" })

  if (records.length === 0) {
    return <p className="empty">Zatím žádné cviky se zátěží.</p>
  }

  return (
    <table className="records-table">
      <thead>
        <tr>
          <th scope="col">Cvik</th>
          <th scope="col">Max váha</th>
          <th scope="col" title={`Epley: váha × (1 + opakování / 30), jen série do ${MAX_REPS_FOR_1RM} opakování`}>
            Odhad 1RM
          </th>
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <tr key={r.name}>
            <th scope="row">{r.name}</th>
            <td title={r.bestWeightDate || ""}>{weight(r.bestWeight)}</td>
            <td title={r.bestE1rmDate || ""}>{r.bestE1rm === null ? "–" : weight(r.bestE1rm)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default PersonalRecords
