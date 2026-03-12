// WeeklyPlan.jsx
const DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"]

const OPTIONS = [
  { value: "off",      label: "Off" },
  { value: "push",     label: "Push" },
  { value: "pull",     label: "Pull" },
  { value: "legs",     label: "Legs" },
  { value: "fullbody", label: "Full body" },
  { value: "other",    label: "Other" },
]

function WeeklyPlan({ plan, onChange, onDayClick }) {
  // Pokud plan náhodou přijde jako objekt, převedeme ho na pole:
  const list = Array.isArray(plan) ? plan : Object.values(plan || {})

  const handleTypeChange = (index, newType) => {
    const next = list.map((day, i) =>
      i === index ? { ...day, type: newType } : day
    )
    onChange(next)
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>Týdenní plán PPL</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {list.map((day, index) => (
          <div
            key={day.day}
            style={{
              minWidth: 130,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #1f2937",
              background: day.type === "off" ? "transparent" : "#020617",
              cursor: "pointer",
            }}
            onClick={() => onDayClick(index, day)}
          >
            <div style={{ fontSize: 14, marginBottom: 4 }}>{day.day}</div>
            <select
              className="select"
              value={day.type}
              onChange={(e) => {
                e.stopPropagation()
                handleTypeChange(index, e.target.value)
              }}
            >
              {OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
// helper na výchozí týdenní plán
export function createDefaultWeeklyPlan() {
  return [
    { day: "Pondělí",  type: "push" },
    { day: "Úterý",    type: "pull" },
    { day: "Středa",   type: "legs" },
    { day: "Čtvrtek",  type: "off" },
    { day: "Pátek",    type: "push" },
    { day: "Sobota",   type: "pull" },
    { day: "Neděle",   type: "off" },
  ]
}

export default WeeklyPlan
