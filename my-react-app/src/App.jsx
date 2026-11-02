// src/App.jsx
import { useState, useEffect, useRef } from "react"
import "./App.css"
import WorkoutForm from "./components/WorkoutForm"
import WorkoutList from "./components/WorkoutList"
import WorkoutFilters from "./components/WorkoutFilters"
import StatsSummary from "./components/StatsSummary"
import PersonalRecords from "./components/PersonalRecords"
import ProgressChart from "./components/ProgressChart"
import WeeklyPlan from "./components/WeeklyPlan"
import PlanAdherence from "./components/PlanAdherence"
import TodayCard from "./components/TodayCard"
import RestTimer from "./components/RestTimer"
import Settings from "./components/Settings"
import Login from "./components/Login"
import Icon from "./components/Icon"
import { createDefaultWeeklyPlan } from "./lib/weeklyPlan"
import { loadWeeklyPlan, saveWeeklyPlan, createLatestSaver } from "./lib/weeklyPlanStore"
import { todaysWorkout, exercisesLabel } from "./lib/todaysWorkout"
import { useRestTimer, restSecondsFromPreference, signalRestDone } from "./lib/restTimer"
import { workoutTypeLabel } from "./lib/workoutTypes"
import { formatWorkoutDate } from "./lib/format"
import { supabase } from "./supabaseClient"
import { filterWorkouts, EMPTY_FILTERS } from "./lib/stats"
import { browserStorage, loadPreferences, savePreferences, resolveLayout } from "./lib/preferences"
import { useMediaQuery } from "./lib/useMediaQuery"

// Below this width "auto" layout switches to the mobile layout.
const NARROW_VIEWPORT = "(max-width: 760px)"

const MOBILE_NAV = [
  { page: "overview", label: "Přehled", icon: "home" },
  { page: "workouts", label: "Tréninky", icon: "list" },
  { page: "plan", label: "Plán", icon: "calendar" },
  { page: "settings", label: "Nastavení", icon: "settings" },
]

const DESKTOP_NAV = [
  { page: "overview", label: "Přehled", icon: "home" },
  { page: "settings", label: "Nastavení", icon: "settings" },
]

function App() {
  const [workouts, setWorkouts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  const [currentDate, setCurrentDate] = useState("")
  const [currentType, setCurrentType] = useState("push")
  const [currentExercises, setCurrentExercises] = useState([])
  const [currentNote, setCurrentNote] = useState("")
  const [saveError, setSaveError] = useState("")
  const [plannedExercises, setPlannedExercises] = useState([])

  const [view, setView] = useState("dashboard")
  const [page, setPage] = useState("overview")
  const [sideTab, setSideTab] = useState("records")
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [statsSource, setStatsSource] = useState("all")
  const [weeklyPlan, setWeeklyPlan] = useState(createDefaultWeeklyPlan)
  // { state: "idle" | "loading" | "load-error" | "saving" | "saved" | "error", message? }
  const [planStatus, setPlanStatus] = useState({ state: "idle" })
  const planSaverRef = useRef(null)

  const [preferences, setPreferences] = useState(() => loadPreferences(browserStorage()))
  const isNarrow = useMediaQuery(NARROW_VIEWPORT)
  const layout = resolveLayout(preferences.layout, isNarrow)
  const units = preferences.units
  const restTimer = useRestTimer({ onDone: signalRestDone })
  const restSeconds = restSecondsFromPreference(preferences.restTimer)

  const filteredWorkouts = filterWorkouts(workouts, filters)
  const filtersActive = filters.type !== "all" || Boolean(filters.from || filters.to)

  const statsWorkouts = statsSource === "all" ? workouts : filteredWorkouts
  const today = todaysWorkout(weeklyPlan, workouts)
  const canStartToday = today.type !== "off" && !today.done

  useEffect(() => {
    savePreferences(browserStorage(), preferences)
  }, [preferences])

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
    setWeeklyPlan(createDefaultWeeklyPlan())
    setPlanStatus({ state: "idle" })
    setPage("overview")
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

  // LOAD WEEKLY PLAN, and set up saving it for this user
  useEffect(() => {
    if (!user) return
    const userId = user.userId
    let cancelled = false

    planSaverRef.current = createLatestSaver(
      (plan) => saveWeeklyPlan(supabase, userId, plan),
      (state, error) => {
        if (error) console.error("Chyba při ukládání plánu:", error)
        if (!cancelled) setPlanStatus({ state, message: error?.message })
      }
    )

    const fetchPlan = async () => {
      setPlanStatus({ state: "loading" })
      try {
        const plan = await loadWeeklyPlan(supabase, userId)
        if (cancelled) return
        setWeeklyPlan(plan)
        setPlanStatus({ state: "idle" })
      } catch (err) {
        console.error("Chyba při načítání plánu:", err)
        if (!cancelled) setPlanStatus({ state: "load-error", message: err.message })
      }
    }

    fetchPlan()
    return () => {
      cancelled = true
      planSaverRef.current = null
    }
  }, [user])

  const handlePlanChange = (plan) => {
    setWeeklyPlan(plan)
    planSaverRef.current?.(plan)
  }

  const resetEditing = () => {
    setSaveError("")
    setPlannedExercises([])
    setEditingId(null)
    setCurrentDate("")
    setCurrentType("push")
    setCurrentExercises([])
    setCurrentNote("")
  }

  const closeForm = () => {
    resetEditing()
    setView("dashboard")
  }

  // Escape closes the workout dialog.
  const dialogOpen = view !== "dashboard"
  useEffect(() => {
    if (!dialogOpen) return
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSaveError("")
        setEditingId(null)
        setView("dashboard")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dialogOpen])

  // Returns true when saved. On failure the dialog stays open with the error,
  // so the user doesn't lose the workout they just typed in.
  const handleSave = async ({ date, type, exercises, note }) => {
    setSaveError("")
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
      return true
    } catch (err) {
      console.error("Chyba při ukládání:", err)
      setSaveError("Nepovedlo se uložit trénink: " + err.message)
      return false
    }
  }

  const handleNewWorkout = () => {
    resetEditing()
    setView("newWorkout")
  }

  // Opens the form for today's planned type, with last time's exercises as one-tap choices.
  const handleStartToday = () => {
    resetEditing()
    setCurrentDate(today.date)
    setCurrentType(today.type)
    setPlannedExercises(today.exerciseNames)
    setView("newWorkout")
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

  const handlePlanDayClick = (_index, dayPlan) => {
    setFilters((prev) => ({ ...prev, type: dayPlan.type === "off" ? "all" : dayPlan.type }))
    setStatsSource("filtered")
    // On mobile the list is on its own tab, so show it.
    if (layout === "mobile") setPage("workouts")
  }

  // LOGIN VIEW
  if (!user) {
    return (
      <div className="app-shell" data-accent={preferences.accent} data-density={preferences.density}>
        <Login onLogin={handleLogin} />
      </div>
    )
  }

  // --- building blocks shared by both layouts ---

  const listCount = filtersActive ? `${filteredWorkouts.length} z ${workouts.length}` : `${workouts.length}`

  const statsSummary = (
    <StatsSummary
      workouts={statsWorkouts}
      units={units}
      source={statsSource}
      onSourceChange={setStatsSource}
      filtersActive={filtersActive}
    />
  )

  const workoutList = (
    <WorkoutList
      workouts={filteredWorkouts}
      units={units}
      onEdit={handleEditWorkout}
      onDelete={handleDeleteWorkout}
      emptyText={filtersActive ? "Filtru neodpovídá žádný trénink." : "Zatím žádné tréninky. Přidej první!"}
    />
  )

  const chart = <ProgressChart workouts={statsWorkouts} units={units} />
  const records = <PersonalRecords workouts={statsWorkouts} units={units} />
  const plan = (
    <>
      <PlanAdherence plan={weeklyPlan} workouts={workouts} />
      <WeeklyPlan
        plan={weeklyPlan}
        onChange={handlePlanChange}
        onDayClick={handlePlanDayClick}
        activeType={filters.type}
        status={planStatus}
      />
    </>
  )

  const settings = (
    <Settings preferences={preferences} onChange={setPreferences} user={user} onLogout={handleLogout} />
  )

  const dialog = dialogOpen && (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && closeForm()}>
      <WorkoutForm
        key={editingId ?? "new"}
        initialDate={currentDate}
        initialType={currentType}
        initialExercises={currentExercises}
        initialNote={currentNote}
        units={units}
        saveError={saveError}
        history={workouts.filter((w) => w.id !== editingId)}
        repRange={preferences.repRange}
        plannedExercises={plannedExercises}
        restTimer={restTimer}
        restSeconds={restSeconds}
        onSave={async (values) => {
          if (await handleSave(values)) setView("dashboard")
        }}
        onCancel={closeForm}
        isEditing={view === "editWorkout" && editingId !== null}
      />
    </div>
  )

  // --- MOBILE LAYOUT: one section per tab, bottom navigation ---
  if (layout === "mobile") {
    const current = MOBILE_NAV.find((n) => n.page === page) ?? MOBILE_NAV[0]
    return (
      <div className="app-shell" data-layout="mobile" data-accent={preferences.accent} data-density={preferences.density}>
        <header className="m-appbar">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="brand" size={18} />
          </span>
          <h1 className="m-title">{current.label}</h1>
          {!dialogOpen && <RestTimer timer={restTimer} compact />}
          {loading && <span className="loading-dot" role="status" aria-label="Načítám tréninky" />}
        </header>

        <main className="m-main">
          {current.page === "overview" && (
            <>
              <TodayCard today={today} onStart={handleStartToday} />
              {statsSummary}
              <section className="card card-featured">
                <h2 className="card-title">Vývoj odhadu 1RM</h2>
                {chart}
              </section>
              <section className="card">
                <div className="card-head">
                  <h2 className="card-title">Poslední tréninky</h2>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setPage("workouts")}>
                    Vše ({workouts.length})
                  </button>
                </div>
                <WorkoutList
                  workouts={workouts.slice(0, 3)}
                  units={units}
                  onEdit={handleEditWorkout}
                  onDelete={handleDeleteWorkout}
                />
              </section>
              <section className="card">
                <h2 className="card-title">Osobní rekordy</h2>
                {records}
              </section>
            </>
          )}

          {current.page === "workouts" && (
            <>
              <details className="card filters-card" open={filtersActive}>
                <summary className="card-title">
                  <Icon name="filter" size={18} /> Filtry
                  {filtersActive && <span className="badge">aktivní</span>}
                </summary>
                <WorkoutFilters filters={filters} onChange={setFilters} />
              </details>
              <p className="muted small list-count">Tréninků: {listCount}</p>
              {workoutList}
            </>
          )}

          {current.page === "plan" && (
            <section className="card">
              <h2 className="card-title">Týdenní plán</h2>
              <p className="muted small">Klepnutím na den zobrazíš tréninky daného typu.</p>
              {plan}
            </section>
          )}

          {current.page === "settings" && settings}
        </main>

        <nav className="m-tabbar" aria-label="Hlavní navigace">
          {MOBILE_NAV.slice(0, 2).map((n) => (
            <TabButton key={n.page} item={n} active={page === n.page} onSelect={setPage} />
          ))}
          <button type="button" className="m-fab" onClick={handleNewWorkout} aria-label="Nový trénink">
            <Icon name="plus" size={26} />
          </button>
          {MOBILE_NAV.slice(2).map((n) => (
            <TabButton key={n.page} item={n} active={page === n.page} onSelect={setPage} />
          ))}
        </nav>

        {dialog}
      </div>
    )
  }

  // --- DESKTOP LAYOUT: everything important on one dashboard ---
  const desktopPage = page === "settings" ? "settings" : "overview"
  return (
    <div className="app-shell" data-layout="desktop" data-accent={preferences.accent} data-density={preferences.density}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="brand" size={18} />
          </span>
          <span className="brand-name">Fitness tracker</span>
        </div>

        <nav className="topnav" aria-label="Hlavní navigace">
          {DESKTOP_NAV.map((n) => (
            <button
              key={n.page}
              type="button"
              className={`topnav-item ${desktopPage === n.page ? "is-active" : ""}`}
              aria-current={desktopPage === n.page ? "page" : undefined}
              onClick={() => setPage(n.page)}
            >
              <Icon name={n.icon} size={18} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="topbar-end">
          {!dialogOpen && <RestTimer timer={restTimer} compact />}
          <span className="user-email" title={user.email}>
            {user.email}
          </span>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Odhlásit se" title="Odhlásit se">
            <Icon name="logout" />
          </button>
          {canStartToday && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStartToday}
              title={
                today.sourceDate
                  ? `${exercisesLabel(today.exerciseNames.length)} jako ${formatWorkoutDate(today.sourceDate)}`
                  : undefined
              }
            >
              <Icon name="calendar" size={18} />
              Dnes: {workoutTypeLabel(today.type)}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={handleNewWorkout}>
            <Icon name="plus" size={18} />
            Nový trénink
          </button>
        </div>
      </header>

      {desktopPage === "settings" ? (
        <main className="page page-scroll">{settings}</main>
      ) : (
        <main className="page dashboard">
          {statsSummary}

          <div className="dashboard-grid">
            <section className="card panel" aria-labelledby="workouts-title">
              <div className="card-head">
                <h2 id="workouts-title" className="card-title">
                  Tréninky <span className="count">{listCount}</span>
                </h2>
                {loading && <span className="muted small">Načítám…</span>}
              </div>
              <WorkoutFilters filters={filters} onChange={setFilters} />
              <div className="panel-scroll">{workoutList}</div>
            </section>

            <div className="dashboard-side">
              <section className="card card-featured" aria-labelledby="chart-title">
                <h2 id="chart-title" className="card-title">
                  Vývoj odhadu 1RM
                </h2>
                {chart}
              </section>

              <section className="card panel">
                <div className="tabs" role="tablist" aria-label="Rekordy a plán">
                  {[
                    { id: "records", label: "Osobní rekordy" },
                    { id: "plan", label: "Týdenní plán" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      id={`tab-${t.id}`}
                      type="button"
                      role="tab"
                      aria-selected={sideTab === t.id}
                      aria-controls={`tabpanel-${t.id}`}
                      className="tab"
                      onClick={() => setSideTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div
                  className="panel-scroll"
                  role="tabpanel"
                  id={`tabpanel-${sideTab}`}
                  aria-labelledby={`tab-${sideTab}`}
                >
                  {sideTab === "records" ? records : plan}
                </div>
              </section>
            </div>
          </div>
        </main>
      )}

      {dialog}
    </div>
  )
}

function TabButton({ item, active, onSelect }) {
  return (
    <button
      type="button"
      className={`m-tab ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(item.page)}
    >
      <Icon name={item.icon} size={22} />
      <span>{item.label}</span>
    </button>
  )
}

export default App
