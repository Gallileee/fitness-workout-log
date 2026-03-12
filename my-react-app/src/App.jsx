// src/App.jsx
import { useState, useEffect } from "react"
import "./App.css"
import WorkoutForm from "./components/WorkoutForm"
import WorkoutList from "./components/WorkoutList"
import StatsPanel from "./components/StatsPanel"
import WorkoutFilters from "./components/WorkoutFilters"
import WeeklyPlan, { createDefaultWeeklyPlan } from "./components/WeeklyPlan"
import Login from "./components/Login"


function App() {
  const [workouts, setWorkouts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null) // { userId, email } nebo null

  const [currentDate, setCurrentDate] = useState("")
  const [currentType, setCurrentType] = useState("push")
  const [currentExercises, setCurrentExercises] = useState([])
  const [currentNote, setCurrentNote] = useState("")

  const [view, setView] = useState("dashboard") 
// "dashboard" | "newWorkout" | "editWorkout"


  const [filters, setFilters] = useState({
    type: "all",
    from: "",
    to: "",
  })

  const [statsSource, setStatsSource] = useState("all") // "all" nebo "filtered"
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

  // načtení usera z localStorage po načtení appky
  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (stored) {
      setUser(JSON.parse(stored))
    }
  }, [])

  // načtení tréninků – jen když je user přihlášený
  useEffect(() => {
    if (!user) return

    const fetchWorkouts = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/workouts", {
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.userId,
          },
        })
        if (!res.ok) {
          throw new Error("Chyba při načítání tréninků")
        }

        const data = await res.json()
        setWorkouts(data)
      } catch (err) {
        console.error("Chyba při načítání:", err)
        alert("Nepovedlo se načíst tréninky: " + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkouts()
  }, [user])

  // LOGIN / REGISTER

  async function handleLogin(email, password) {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      console.log("LOGIN RESPONSE:", data)   

      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Chyba při přihlášení")
      }

      const userInfo = { userId: data.userId, email: data.email }
      setUser(userInfo)
      localStorage.setItem("user", JSON.stringify(userInfo))
    } catch (err) {
      console.error(err)
      alert("Nepovedlo se přihlásit: " + err.message)
    }
  }

async function handleRegister(email, password) {
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    console.log("REGISTER RESPONSE:", data)

    if (!res.ok || data.status !== "success") {
      throw new Error(data.message || "Chyba při registraci")
    }

    // po úspěšné registraci rovnou přihlásíme
    await handleLogin(email, password)
  } catch (err) {
    console.error(err)
    alert("Nepovedlo se zaregistrovat: " + err.message)
  }
}


  function handleLogout() {
    setUser(null)
    setWorkouts([])
    localStorage.removeItem("user")
  }

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
      const url =
        editingId === null ? "/api/workouts" : `/api/workouts/${editingId}`
      const method = editingId === null ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(
          editingId === null
            ? "Chyba při ukládání tréninku"
            : "Chyba při úpravě tréninku"
        )
      }

      const savedWorkout = await res.json()

      setWorkouts((prev) => {
        if (editingId === null) {
          return [savedWorkout, ...prev]
        } else {
          return prev.map((w) => (w.id === savedWorkout.id ? savedWorkout : w))
        }
      })

      resetEditing()
    } catch (err) {
      console.error("Chyba při ukládání:", err)
      alert("Nepovedlo se uložit trénink na server: " + err.message)
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
    const res = await fetch(`/api/workouts/${id}`, {
      method: "DELETE",
      headers: {
        "x-user-id": user.userId,
      },
    })
    if (!res.ok) throw new Error("Chyba při mazání tréninku")
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    if (editingId === id) resetEditing()
  } catch (err) {
    console.error(err)
    alert("Nepovedlo se smazat trénink na serveru")
  }
}

if (!user) {
  return (
    <div className="app">
      <h1 className="app-title">Fitness tracker</h1>
      <Login onLogin={handleLogin} onRegister={handleRegister} />
    </div>
  )
}

return (
  <div className="app">
    <h1 className="app-title">
      Fitness tracker{" "}
      <span style={{ fontSize: 14, marginLeft: 8 }}>
        ({user.email}){" "}
        <button
          type="button"
          className="btn btn-outline"
          style={{ fontSize: 12, padding: "2px 8px" }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </span>
    </h1>

    {loading && <p>Načítám tréninky ze serveru…</p>}

    <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-start" }}>
      <button
        type="button"
        className="btn"
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

    {/* OVERLAY – jediný formulář */}
    {view !== "dashboard" && (
      <div className="overlay">
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

    <div className="card" style={{ marginBottom: 16 }}>
  {/* ... Zdroj statistik, beze změny ... */}
</div>
<StatsPanel workouts={statsWorkouts} />
<WeeklyPlan
    plan={WeeklyPlan}
    onChange={WeeklyPlan}
    onDayClick={(_index, dayPlan) => {
      if (dayPlan.type === "off") {
        setFilters((prev) => ({ ...prev, type: "all" }))
      } else {
        setFilters((prev) => ({ ...prev, type: dayPlan.type }))
      }
      setStatsSource("filtered")
    } } />
    <WorkoutFilters filters={filters} onChange={setFilters} />

    <div className="grid">
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
