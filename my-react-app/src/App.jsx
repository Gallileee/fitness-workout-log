// src/App.jsx
import { useState, useEffect } from "react"
import "./App.css"
import WorkoutForm from "./components/WorkoutForm"
import WorkoutList from "./components/WorkoutList"
import StatsPanel from "./components/StatsPanel"
import WorkoutFilters from "./components/WorkoutFilters"
import WeeklyPlan, { createDefaultWeeklyPlan } from "./components/WeeklyPlan"

function App() {
  const [workouts, setWorkouts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

  const [currentDate, setCurrentDate] = useState("")
  const [currentType, setCurrentType] = useState("push")
  const [currentExercises, setCurrentExercises] = useState([])
  const [currentNote, setCurrentNote] = useState("")

  const [filters, setFilters] = useState({
    type: "all",
    from: "",
    to: "",
  })

  const [statsSource, setStatsSource] = useState("all") // "all" nebo "filtered"
  const [weeklyPlan, setWeeklyPlan] = useState(createDefaultWeeklyPlan())

  const filteredWorkouts = workouts.filter((w) => {
    if (filters.type !== "all" && w.type !== filters.type) {
      return false
    }

    if (filters.from) {
      const fromDate = new Date(filters.from)
      const workoutDate = new Date(w.date)
      if (workoutDate < fromDate) return false
    }

    if (filters.to) {
      const toDate = new Date(filters.to)
      const workoutDate = new Date(w.date)
      if (workoutDate > toDate) return false
    }

    return true
  })

  const statsWorkouts =
    statsSource === "all" ? workouts : filteredWorkouts

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/workouts")
        if (!res.ok) {
          throw new Error("Chyba při načítání tréninků")
        }
        const data = await res.json()
        setWorkouts(data)
      } catch (err) {
        console.error(err)
        alert("Nepovedlo se načíst tréninky ze serveru")
      } finally {
        setLoading(false)
      }
    }

    fetchWorkouts()
  }, [])

  const resetEditing = () => {
    setEditingId(null)
    setCurrentDate("")
    setCurrentType("push")
    setCurrentExercises([])
    setCurrentNote("")
  }

  const handleSave = async ({ date, type, exercises, note }) => {
    const payload = { date, type, exercises, note }

    try {
      if (editingId === null) {
  const res = await fetch('/api/workouts', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Chyba při ukládání tréninku")
  const created = await res.json()
  setWorkouts((prev) => [created, ...prev])
} else {
  const res = await fetch(`/api/workouts/${editingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Chyba při úpravě tréninku")
  const updated = await res.json()
  setWorkouts((prev) =>
    prev.map((w) => (w.id === updated.id ? updated : w))
  )
}


      resetEditing()
    } catch (err) {
      console.error(err)
      alert("Nepovedlo se uložit trénink na server")
    }
  }

  const handleEditWorkout = (id) => {
    const workout = workouts.find((w) => w.id === id)
    if (!workout) return
    setEditingId(id)
    setCurrentDate(workout.date || "")
    setCurrentType(workout.type || "push")
    setCurrentExercises(workout.exercises || [])
    setCurrentNote(workout.note || "")
  }

  const handleDeleteWorkout = async (id) => {
    if (!confirm("Opravdu smazat celý trénink?")) return
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Chyba při mazání tréninku")
      setWorkouts((prev) => prev.filter((w) => w.id !== id))
      if (editingId === id) resetEditing()
    } catch (err) {
      console.error(err)
      alert("Nepovedlo se smazat trénink na serveru")
    }
  }

  return (
    <div className="app">
      <h1 className="app-title">
        Fitness tracker
      </h1>

      {loading && <p>Načítám tréninky ze serveru…</p>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Zdroj statistik</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ opacity: statsSource === "all" ? 1 : 0.6 }}
              onClick={() => setStatsSource("all")}
            >
              Všechny tréninky
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ opacity: statsSource === "filtered" ? 1 : 0.6 }}
              onClick={() => setStatsSource("filtered")}
            >
              Pouze filtrované
            </button>
          </div>
        </div>
      </div>

      <StatsPanel workouts={statsWorkouts} />

      <WeeklyPlan
        plan={weeklyPlan}
        onChange={setWeeklyPlan}
        onDayClick={(index, dayPlan) => {
          if (dayPlan.type === "off") {
            setFilters((prev) => ({
              ...prev,
              type: "all",
            }))
          } else {
            setFilters((prev) => ({
              ...prev,
              type: dayPlan.type,
            }))
          }
          setStatsSource("filtered")
        }}
      />

      <WorkoutFilters filters={filters} onChange={setFilters} />

      <div className="grid">
        <WorkoutForm
          initialDate={currentDate}
          initialType={currentType}
          initialExercises={currentExercises}
          initialNote={currentNote}
          onSave={handleSave}
          onCancel={resetEditing}
          isEditing={editingId !== null}
        />

        <WorkoutList
          workouts={filteredWorkouts}
          onEdit={handleEditWorkout}
          onDelete={handleDeleteWorkout}
        />
      </div>
    </div>
  )
}

export default App
