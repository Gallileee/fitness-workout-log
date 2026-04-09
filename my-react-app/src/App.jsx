// src/App.jsx
import { useState, useEffect } from "react"
import "./App.css"
import WorkoutForm from "./components/WorkoutForm"
import WorkoutList from "./components/WorkoutList"
import StatsPanel from "./components/StatsPanel"
import { createDefaultWeeklyPlan } from "./components/WeeklyPlan"
import Login from "./components/Login"
import { supabase } from "./supabaseClient"

function App() {
  const [workouts, setWorkouts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  const [currentDate, setCurrentDate] = useState("")
  const [currentType, setCurrentType] = useState("push")
  const [currentExercises, setCurrentExercises] = useState([])
  const [currentNote, setCurrentNote] = useState("")

  const [view, setView] = useState("dashboard")
  const [filters, setFilters] = useState({ type: "all", from: "", to: "" })
  const [statsSource, setStatsSource] = useState("all")
  const [weeklyPlan, setWeeklyPlan] = useState(createDefaultWeeklyPlan())

  const filteredWorkouts = workouts.filter((w) => {
    if (filters.type !== "all" && w.type !== filters.type) return false
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

  const statsWorkouts = statsSource === "all" ? workouts : filteredWorkouts

  // AUTH
  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) setUser(JSON.parse(stored))

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const u = data.session.user
        const userInfo = { userId: u.id, email: u.email }
        setUser(userInfo)
        localStorage.setItem("user", JSON.stringify(userInfo))
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const u = session.user
          const userInfo = { userId: u.id, email: u.email }
          setUser(userInfo)
          localStorage.setItem("user", JSON.stringify(userInfo))
        } else {
          setUser(null)
          localStorage.removeItem("user")
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogin = (userInfo) => {
    setUser(userInfo)
    localStorage.setItem("user", JSON.stringify(userInfo))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setWorkouts([])
    localStorage.removeItem("user")
  }

  // LOAD WORKOUTS
  useEffect(() => {
    if (!user) return

    const fetchWorkouts = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", user.userId)
          .order("date", { ascending: false })

        if (error) throw error
        setWorkouts(data || [])
      } catch (err) {
        console.error("Chyba při načítání:", err)
        alert("Nepovedlo se načíst tréninky: " + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkouts()
  }, [user])

  const resetEditing = () => {
    setEditingId(null)
    setCurrentDate("")
    setCurrentType("push")
    setCurrentExercises([])
    setCurrentNote("")
  }

  const handleSave = async ({ date, type, exercises, note }) => {
    const payload = {
      user_id: user.userId,
      date,
      type,
      exercises,
      note,
    }

    try {
      let result
      if (editingId === null) {
        result = await supabase.from("workouts").insert(payload).select().single()
      } else {
        result = await supabase
          .from("workouts")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.userId)
          .select()
          .single()
      }

      const { data: savedWorkout, error } = result
      if (error) throw error

      setWorkouts((prev) =>
        editingId === null
          ? [savedWorkout, ...prev]
          : prev.map((w) => (w.id === savedWorkout.id ? savedWorkout : w))
      )
      resetEditing()
    } catch (err) {
      console.error("Chyba při ukládání:", err)
      alert("Nepovedlo se uložit trénink: " + err.message)
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
    setView("editWorkout")
  }

  const handleDeleteWorkout = async (id) => {
    if (!confirm("Opravdu smazat celý trénink?")) return

    try {
      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.userId)

      if (error) throw error

      setWorkouts((prev) => prev.filter((w) => w.id !== id))
      if (editingId === id) resetEditing()
    } catch (err) {
      console.error(err)
      alert("Nepovedlo se smazat trénink: " + err.message)
    }
  }

  // LOGIN VIEW
  if (!user) {
    return (
      <div className="app">
        <h1 className="app-title">Fitness tracker</h1>
        <Login onLogin={handleLogin} />
      </div>
    )
  }

  // DASHBOARD VIEW
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Fitness tracker</h1>
        <div className="app-header-controls">
          <span className="user-email">{user.email}</span>
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {loading && <p className="loading-text">Načítám tréninky ze serveru…</p>}

      <div className="action-bar">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => {
            resetEditing()
            setView("newWorkout")
          }}
        >
          Nový trénink
        </button>
      </div>

      <div className="dashboard-container">
        {/* List (left) and Stats (with Weekly Plan and Filters embedded) (right) side-by-side on desktop, stacked on mobile */}
        <div className="main-grid">
          <WorkoutList
            workouts={filteredWorkouts}
            onEdit={handleEditWorkout}
            onDelete={handleDeleteWorkout}
          />
          <StatsPanel
            workouts={statsWorkouts}
            weeklyPlan={weeklyPlan}
            onWeeklyPlanChange={setWeeklyPlan}
            onWeeklyPlanDayClick={(_index, dayPlan) => {
              if (dayPlan.type === "off") {
                setFilters((prev) => ({ ...prev, type: "all" }))
              } else {
                setFilters((prev) => ({ ...prev, type: dayPlan.type }))
              }
              setStatsSource("filtered")
            }}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>

      {view !== "dashboard" && (
        <div className="overlay" style={{ zIndex: 200 }}>
          <WorkoutForm
            initialDate={currentDate}
            initialType={currentType}
            initialExercises={currentExercises}
            initialNote={currentNote}
            onSave={async (values) => {
              await handleSave(values)
              setView("dashboard")
            }}
            onCancel={() => {
              resetEditing()
              setView("dashboard")
            }}
            isEditing={view === "editWorkout" && editingId !== null}
          />
        </div>
      )}
    </div>
  )
}

export default App
