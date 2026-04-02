// src/components/DateWFi.jsx
function formatDate(value) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = String(d.getFullYear()).slice(-2)
  return `${day}. ${month}. ${year}`
}

function DateWFi({ label, value, onChange, placeholder = "dd. mm. rr" }) {
  const display = formatDate(value) || placeholder

  const handleClick = (e) => {
    const input = e.currentTarget.querySelector("input[type='date']")
    if (input) {
      input.showPicker?.()
      input.focus()
    }
  }

  return (
    <div className="field" style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 325 }}>
      {label && <label className="label">{label}</label>}
      <div className="date-chip-wrapper" onClick={handleClick}>
        <div className="date-chip" style={{ color: formatDate(value) ? "inherit" : "#888", minWidth: 300 }}>
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
            style={{ right: "0.5rem" }}
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

export default DateWFi
