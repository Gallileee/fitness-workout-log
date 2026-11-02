// src/components/WeeklyPlan.jsx
import { WORKOUT_TYPES } from "../lib/workoutTypes"

const OPTIONS = [{ value: "off", label: "Volno" }, ...WORKOUT_TYPES]

function statusText({ state, message }) {
  switch (state) {
    case "loading":
      return "Načítám plán…"
    case "saving":
      return "Ukládám…"
    case "saved":
      return "Plán uložen."
    case "error":
      return `Plán se nepovedlo uložit (${message}). Změny platí jen do obnovení stránky.`
    case "load-error":
      return `Uložený plán se nepovedlo načíst (${message}). Zobrazuji výchozí plán.`
    default:
      return ""
  }
}

// Each day: a button that filters the history by that day's type, and a select to change the plan.
// The plan is saved by the parent; `status` says how that is going.
function WeeklyPlan({ plan, onChange, onDayClick, activeType, status = { state: "idle" } }) {
  const list = Array.isArray(plan) ? plan : Object.values(plan || {})

  const handleTypeChange = (index, newType) => {
    onChange(list.map((day, i) => (i === index ? { ...day, type: newType } : day)))
  }

  const isError = status.state === "error" || status.state === "load-error"

  return (
    <>
      <ul className="plan-list">
        {list.map((day, index) => {
          const isOff = day.type === "off"
          const isActive = !isOff && day.type === activeType
          return (
            <li key={day.day} className={`plan-day ${isOff ? "plan-day-off" : ""} ${isActive ? "plan-day-active" : ""}`}>
              <button
                type="button"
                className="plan-day-button"
                onClick={() => onDayClick(index, day)}
                title={isOff ? "Zrušit filtr typu" : `Zobrazit tréninky typu ${day.type}`}
              >
                {day.day}
              </button>
              <select
                className="input input-select plan-select"
                value={day.type}
                aria-label={`Plán na ${day.day}`}
                disabled={status.state === "loading"}
                onChange={(e) => handleTypeChange(index, e.target.value)}
              >
                {OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </li>
          )
        })}
      </ul>
      <p className={`small plan-status ${isError ? "plan-status-error" : "muted"}`} role="status">
        {statusText(status)}
      </p>
    </>
  )
}

export default WeeklyPlan
