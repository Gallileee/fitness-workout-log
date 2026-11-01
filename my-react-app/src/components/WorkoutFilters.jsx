import DatePicker from "./DatePicker.jsx"

function WorkoutFilters({ filters, onChange }) {
  const handleTypeChange = (e) => {
    onChange({ ...filters, type: e.target.value })
  }
  const handleReset = () => {
    onChange({ type: "all", from: "", to: "" })
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>Filtry</h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-end",
        }}
      >
        <div className="field" style={{ minWidth: 160 }}>
          <label className="label">Typ tréninku</label>
          <select
            className="select"
            value={filters.type}
            onChange={handleTypeChange}
          >
            <option value="all">Vše</option>
            <option value="fullbody">Full body</option>
            <option value="push">Push</option>
            <option value="pull">Pull</option>
            <option value="legs">Legs</option>
            <option value="core">Core</option>
            <option value="other">Other</option>
          </select>
        </div>

<div className="input-row">
  <DatePicker
    label="Od data"
    value={filters.from}
    onChange={(v) => onChange({ ...filters, from: v })}
  />
  
  <DatePicker
    label="Do data"
    value={filters.to}
    onChange={(v) => onChange({ ...filters, to: v })}
    placeholder="dd. mm. rr"
  />
</div>


  <div className="field" style={{ marginLeft: "auto" }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleReset}
          >
            Vyčistit filtr
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkoutFilters
