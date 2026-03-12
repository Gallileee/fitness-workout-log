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
        {/* typ, od, do ... beze změny */}
        <div className="field" style={{ alignSelf: "flex-end" }}>
          <button
            className="btn btn-outline"
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
