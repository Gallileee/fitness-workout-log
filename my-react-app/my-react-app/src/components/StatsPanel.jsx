// src/components/StatsPanel.jsx

function StatsPanel({ workouts }) {
  const totalWorkouts = workouts.length

  // pomocná funkce na objem jednoho tréninku
  const getWorkoutVolume = (workout) => {
    return (workout.exercises || []).reduce((acc, ex) => {
      const sets = Number(ex.sets || 0)
      const reps = Number(ex.reps || 0)
      const weight = Number(ex.weight || 0)
      return acc + sets * reps * weight
    }, 0)
  }

  // celkový objem přes všechny tréninky
  const totalVolume = workouts.reduce(
    (sum, w) => sum + getWorkoutVolume(w),
    0
  )

  // objem za posledních 7 dní
  const now = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(now.getDate() - 7)

  const workoutsLast7Days = workouts.filter((w) => {
    if (!w.date) return false
    const d = new Date(w.date)
    return d >= sevenDaysAgo && d <= now
  })

  const volumeLast7Days = workoutsLast7Days.reduce(
    (sum, w) => sum + getWorkoutVolume(w),
    0
  )

  // průměrný objem na trénink (přes všechny tréninky)
  const avgVolumePerWorkout =
    totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2>Souhrn</h2>
      {totalWorkouts === 0 ? (
        <p>Zatím žádná data pro statistiky.</p>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="label">Tréninků celkem</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {totalWorkouts}
            </div>
          </div>
          <div>
            <div className="label">Objem celkem (sets×reps×kg)</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {totalVolume}
            </div>
          </div>
          <div>
            <div className="label">Objem za posledních 7 dní</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {volumeLast7Days}
            </div>
          </div>
          <div>
            <div className="label">Průměrný objem na trénink</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {avgVolumePerWorkout}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsPanel
