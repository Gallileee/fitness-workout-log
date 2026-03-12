// src/components/WorkoutFilters.jsx
function WorkoutFilters({ filters, onChange, onNewCard }) {
  const handleTypeChange = (e) => {
    onChange({ ...filters, type: e.target.value })
  }

  const handleFromChange = (e) => {
    onChange({ ...filters, from: e.target.value })
  }

  const handleToChange = (e) => {
    onChange({ ...filters, to: e.target.value })
  }

  const handleReset = () => {
    onChange({ type: "all", from: "", to: "" })
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>Filtry</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="field">
          <label className="label">Typ tréninku</label>
          <select
            className="select"
            value={filters.type}
            onChange={handleTypeChange}
          >
            <option value="all">Vše</option>
            <option value="push">Push</option>
            <option value="pull">Pull</option>
            <option value="legs">Legs</option>
            <option value="core">Core</option>
            <option value="other">Other</option>
            <option value="fullbody">Full body</option>
          </select>
        </div>

        <div className="field">
          <label className="label">Od data</label>
          <input
            className="input"
            type="date"
            value={filters.from}
            onChange={handleFromChange}
          />
        </div>

        <div className="field">
          <label className="label">Do data</label>
          <input
            className="input"
            type="date"
            value={filters.to}
            onChange={handleToChange}
          />
        </div>

        <div className="field" style={{ alignSelf: "flex-end", display: "flex", gap: 8 }}>
          <button
            className="btn btn-outline"
            type="button"
            onClick={handleReset}
          >
            Vyčistit filtr
          </button>

          <button
            className="btn"
            type="button"
            onClick={onNewCard}
          >
            Nový trénink (karta)
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorkoutFilters
