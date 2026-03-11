// src/components/WeeklyPlan.jsx
const DAYS = [
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
  "Neděle",
]

const TYPES = [
  { value: "off", label: "Off" },
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "legs", label: "Legs" },
  { value: "fullbody", label: "Full body" },
  { value: "other", label: "Other" },
]

function WeeklyPlan({ plan, onChange, onDayClick }) {
  const handleTypeChange = (index, newType) => {
    const next = plan.map((dayPlan, i) =>
      i === index ? { ...dayPlan, type: newType } : dayPlan
    )
    onChange(next)
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>Týdenní plán (PPL)</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {plan.map((dayPlan, index) => (
          <div
            key={dayPlan.day}
            style={{
              minWidth: 130,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #1f2937",
              background:
                dayPlan.type === "off" ? "transparent" : "#020617",
              cursor: "pointer",
            }}
            onClick={() => {
              if (onDayClick) onDayClick(index, dayPlan)
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 4 }}>
              {dayPlan.day}
            </div>
            <select
              className="select"
              value={dayPlan.type}
              onChange={(e) => {
                e.stopPropagation() // aby změna typu nespustila onDayClick
                handleTypeChange(index, e.target.value)
              }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

export function createDefaultWeeklyPlan() {
  // klasický 3denní PPL: Po Push, St Pull, Pá Legs
  return DAYS.map((day, i) => {
    let type = "off"
    if (i === 0) type = "push"      // Po
    if (i === 2) type = "pull"      // St
    if (i === 4) type = "legs"      // Pá
    return { day, type }
  })
}

export default WeeklyPlan
