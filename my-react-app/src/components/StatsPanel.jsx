// src/components/StatsPanel.jsx
function StatsPanel({ workouts }) {
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
    <div className="card" style={{ marginBottom: 24 }}>
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
    </div>
  )
}

export default StatsPanel
