// src/App.jsx
import { useState, useEffect } from "react"
import "./App.css"
import WorkoutForm from "./components/WorkoutForm"
import WorkoutList from "./components/WorkoutList"
import StatsPanel from "./components/StatsPanel"
import WorkoutFilters from "./components/WorkoutFilters"
import WeeklyPlan, { createDefaultWeeklyPlan } from "./components/WeeklyPlan"
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

  // nový stav pro layout
  const [layout, setLayout] = useState(
    window.innerWidth < 768 ? "mobile" : "desktop"
  )

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

  // automatická změna layoutu podle šířky okna
  useEffect(() => {
    const onResize = () => {
      setLayout(window.innerWidth < 768 ? "mobile" : "desktop")
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
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
      <h1 className="app-title">
        Fitness tracker{" "}
        <span style={{ fontSize: 14, marginLeft: 8 }}>
          ({user.email}){" "}
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: 12, padding: "2px 8px", marginLeft: 4 }}
            onClick={handleLogout}
          >
            Logout
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: 12, padding: "2px 8px", marginLeft: 8 }}
            onClick={() =>
              setLayout((prev) => (prev === "desktop" ? "mobile" : "desktop"))
            }
          >
            {layout === "desktop" ? "Mobilní UI" : "Desktop UI"}
          </button>
        </span>
      </h1>

      {loading && <p>Načítám tréninky ze serveru…</p>}

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "flex-start",
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          style={{
            padding: "12px 24px",
            fontSize: 16,
            borderRadius: 9999,
          }}
          onClick={() => {
            resetEditing()
            setView("newWorkout")
          }}
        >
          Nový trénink
        </button>
      </div>

      {layout === "desktop" ? (
        <>
          {/* desktop – souhrn + seznam vedle sebe */}
          <div className="grid" style={{ marginBottom: 24 }}>
            <StatsPanel workouts={statsWorkouts} />
            <WorkoutList
              workouts={filteredWorkouts}
              onEdit={handleEditWorkout}
              onDelete={handleDeleteWorkout}
            />
          </div>

          <WeeklyPlan
            plan={weeklyPlan}
            onChange={setWeeklyPlan}
            onDayClick={(_index, dayPlan) => {
              if (dayPlan.type === "off") {
                setFilters((prev) => ({ ...prev, type: "all" }))
              } else {
                setFilters((prev) => ({ ...prev, type: dayPlan.type }))
              }
              setStatsSource("filtered")
            }}
          />

          <WorkoutFilters filters={filters} onChange={setFilters} />
        </>
      ) : (
        <>
          {/* mobile – vše pod sebou v jiném pořadí */}
          <StatsPanel workouts={statsWorkouts} />

          <WorkoutFilters filters={filters} onChange={setFilters} />

          <WorkoutList
            workouts={filteredWorkouts}
            onEdit={handleEditWorkout}
            onDelete={handleDeleteWorkout}
          />

          <WeeklyPlan
            plan={weeklyPlan}
            onChange={setWeeklyPlan}
            onDayClick={(_index, dayPlan) => {
              if (dayPlan.type === "off") {
                setFilters((prev) => ({ ...prev, type: "all" }))
              } else {
                setFilters((prev) => ({ ...prev, type: dayPlan.type }))
              }
              setStatsSource("filtered")
            }}
          />
        </>
      )}

      {view !== "dashboard" && (
        <div className="overlay" style={{ zIndex: 200 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setView("dashboard")
              resetEditing()
            }}
          >
            Back to dashboard
          </button>

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
