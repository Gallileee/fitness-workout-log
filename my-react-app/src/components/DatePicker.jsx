// src/components/DatePicker.jsx
// Labelled native date input: it gets the platform's own picker (a proper
// touch UI on phones) and keyboard support for free.
import { useId } from "react"

function DatePicker({ label, value, onChange, required = false }) {
  const id = useId()
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        type="date"
        value={value || ""}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default DatePicker
