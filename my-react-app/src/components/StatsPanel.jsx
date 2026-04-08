// src/components/StatsPanel.jsx
import WeeklyPlan from "./WeeklyPlan"
import WorkoutFilters from "./WorkoutFilters"

function StatsPanel({
  workouts,
  weeklyPlan,
  onWeeklyPlanChange,
  onWeeklyPlanDayClick,
  filters,
  onFiltersChange,
}) {
  const list = Array.isArray(workouts) ? workouts : []

  const totalWorkouts = list.length

  const getWorkoutVolume = (workout) => {
    return (workout.exercises || []).reduce((acc, ex) => {
      const sets = Number(ex.sets || 0)
      const reps = Number(ex.reps || 0)
      const weight = Number(ex.weight || 0)
      return acc + sets * reps * weight
    }, 0)
  }

  const totalVolume = list.reduce(
    (sum, w) => sum + getWorkoutVolume(w),
    0
  )

  const now = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(now.getDate() - 7)

  const workoutsLast7Days = list.filter((w) => {
    if (!w.date) return false
    const d = new Date(w.date)
    return d >= sevenDaysAgo && d <= now
  })

  const volumeLast7Days = workoutsLast7Days.reduce(
    (sum, w) => sum + getWorkoutVolume(w),
    0
  )

  const avgVolumePerWorkout =
    totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0

  return (
    <div className="card">
      <h2>Souhrn</h2>

      {totalWorkouts === 0 ? (
        <p>Zatím žádná data pro statistiky.</p>
      ) : (
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-label">Počet tréninků</div>
            <div className="stat-value">{totalWorkouts}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Celkový objem (kg)</div>
            <div className="stat-value">{totalVolume}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Objem za 7 dní (kg)</div>
            <div className="stat-value">{volumeLast7Days}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Průměrný objem / trénink</div>
            <div className="stat-value">{avgVolumePerWorkout}</div>
          </div>
        </div>
      )}

      {/* Weekly Plan embedded in Stats Panel */}
      <div style={{ marginTop: "8px", borderTop: "1px solid #1f2937", paddingTop: "8px", minHeight: 0 }}>
        <h3 style={{ fontSize: "16px", margin: "0 0 6px 0", fontWeight: 600, color: "#9ca3af" }}>Týdenní plán PPL</h3>
        <WeeklyPlan
          plan={weeklyPlan}
          onChange={onWeeklyPlanChange}
          onDayClick={onWeeklyPlanDayClick}
          isEmbedded={true}
        />
      </div>

      {/* Filters embedded in Stats Panel */}
      <div style={{ marginTop: "8px", borderTop: "1px solid #1f2937", paddingTop: "8px", minHeight: 0 }}>
        <WorkoutFilters filters={filters} onChange={onFiltersChange} />
      </div>
    </div>
  )
}

export default StatsPanel
