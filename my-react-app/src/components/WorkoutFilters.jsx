// src/components/WorkoutFilters.jsx
import { useId } from "react"
import DatePicker from "./DatePicker.jsx"
import { WORKOUT_TYPES } from "../lib/workoutTypes"
import { EMPTY_FILTERS } from "../lib/stats"

function WorkoutFilters({ filters, onChange }) {
  const typeId = useId()
  const active = filters.type !== "all" || filters.from || filters.to

  return (
    <div className="filters">
      <div className="field">
        <label className="label" htmlFor={typeId}>
          Typ
        </label>
        <select
          id={typeId}
          className="input input-select"
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
        >
          <option value="all">Vše</option>
          {WORKOUT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <DatePicker label="Od" value={filters.from} onChange={(v) => onChange({ ...filters, from: v })} />
      <DatePicker label="Do" value={filters.to} onChange={(v) => onChange({ ...filters, to: v })} />
      <button
        className="btn btn-ghost filters-reset"
        type="button"
        onClick={() => onChange(EMPTY_FILTERS)}
        disabled={!active}
      >
        Zrušit filtr
      </button>
    </div>
  )
}

export default WorkoutFilters
