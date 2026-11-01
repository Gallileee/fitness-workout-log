// WeeklyPlan.jsx
const OPTIONS = [
  { value: "off",      label: "Off" },
  { value: "push",     label: "Push" },
  { value: "pull",     label: "Pull" },
  { value: "legs",     label: "Legs" },
  { value: "fullbody", label: "Full body" },
  { value: "other",    label: "Other" },
]

function WeeklyPlan({ plan, onChange, onDayClick, isEmbedded = false }) {
  // Pokud plan náhodou přijde jako objekt, převedeme ho na pole:
  const list = Array.isArray(plan) ? plan : Object.values(plan || {})

  const handleTypeChange = (index, newType) => {
    const next = list.map((day, i) =>
      i === index ? { ...day, type: newType } : day
    )
    onChange(next)
  }

  const content = (
    <div className="weekly-plan-grid">
      {list.map((day, index) => (
        <div
          key={day.day}
          className={`weekly-plan-day ${day.type === "off" ? "off-day" : "active-day"}`}
          onClick={() => onDayClick(index, day)}
        >
          <div className="weekly-plan-day-label">{day.day}</div>
          <select
            className="weekly-plan-select"
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
  )

  if (isEmbedded) {
    return content
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>Týdenní plán PPL</h2>
      {content}
    </div>
  )
}

export default WeeklyPlan
