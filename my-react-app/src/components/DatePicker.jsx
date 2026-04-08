// src/components/DatePicker.jsx
// Unified Date Picker component (replaces DateWFo.jsx and DateWFi.jsx)

function formatDate(value) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  return `${day}. ${month}. ${year}`
}

function DatePicker({ label, value, onChange, placeholder = "dd. mm. rr" }) {
  const display = formatDate(value) || placeholder

  const handleClick = (e) => {
    const input = e.currentTarget.querySelector("input[type='date']")
    if (input) {
      input.showPicker?.()
      input.focus()
    }
  }

  return (
    <div className="field">
      {label && <label className="label">{label}</label>}
      <div className="date-chip-wrapper" onClick={handleClick}>
        <div className="date-chip">
          <span
            className={
              formatDate(value) ? "" : "date-chip-placeholder"
            }
          >
            {display}
          </span>
          <img
            src="/calendar.svg"
            alt=""
            className="date-chip-icon"
          />
        </div>
        <input
          type="date"
          className="hidden-date-input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export default DatePicker
