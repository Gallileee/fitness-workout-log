// src/App.jsx
import { useState, useEffect, useRef, useCallback } from "react"
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
import RestTimerPanel from "./components/RestTimerPanel"
import RestTimer from "./components/RestTimer"
import Settings from "./components/Settings"
import Login from "./components/Login"
import Icon from "./components/Icon"
import { createDefaultWeeklyPlan } from "./lib/weeklyPlan"
import {
  loadWeeklyPlan,
  loadPlanHistory,
  saveWeeklyPlan,
  createLatestSaver,
} from "./lib/weeklyPlanStore"
import { todaysWorkout } from "./lib/todaysWorkout"
import { useRestTimer, restSecondsFromPreference, signalRestDone, DEFAULT_REST_SECONDS } from "./lib/restTimer"
import { loadFontTheme } from "./lib/fonts"
import { supabase } from "./supabaseClient"
import { filterWorkouts, EMPTY_FILTERS } from "./lib/stats"
import { browserStorage, loadPreferences, savePreferences, resolveLayout, platesKey, withExerciseRepRange, withPlateLoading } from "./lib/preferences"
import { useWakeLock } from "./lib/wakeLock"
import { useWorkoutInProgress } from "./lib/workoutSession"
import { useRestNotifications, showRestDoneNotification, closeRestNotifications } from "./lib/restNotification"
import { useMediaQuery } from "./lib/useMediaQuery"

// Below this width "auto" layout switches to the mobile layout.
const NARROW_VIEWPORT = "(max-width: 760px)"
// The history list shows this many workouts, then "Zobrazit další".
const WORKOUTS_PAGE_SIZE = 10

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

// The last signed-in user from localStorage, so a reload shows the dashboard
// straight away. Read once when App mounts (not in an effect, which would render
// the login screen first). Corrupt or blocked storage means "not signed in".
function loadStoredUser() {
  try {
    const stored = localStorage.getItem("user")
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function App() {
  const [workouts, setWorkouts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  // Bumped by "Zkusit znovu" to load the workouts again.
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [user, setUser] = useState(loadStoredUser)

  const [currentDate, setCurrentDate] = useState("")
  const [currentType, setCurrentType] = useState("push")
  const [currentExercises, setCurrentExercises] = useState([])
  const [currentNote, setCurrentNote] = useState("")
  const [saveError, setSaveError] = useState("")
  const [plannedExercises, setPlannedExercises] = useState([])

  const [view, setView] = useState("dashboard")
  const [page, setPage] = useState("overview")
  // The weekly plan comes first: it matters more day to day than the records.
  const [sideTab, setSideTab] = useState("plan")
  // Mobile "Tréninky" page: the history list, or progress (summary, 1RM, records).
  const [workoutsView, setWorkoutsView] = useState("list")
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [statsSource, setStatsSource] = useState("all")
  const [weeklyPlan, setWeeklyPlan] = useState(createDefaultWeeklyPlan)
  // Plans of past weeks, for the adherence chart (lib/planHistory.js). Loaded once:
  // a change made now only applies to this week, which uses weeklyPlan anyway.
  const [planHistory, setPlanHistory] = useState([])
  // { state: "idle" | "loading" | "load-error" | "saving" | "saved" | "error", message? }
  const [planStatus, setPlanStatus] = useState({ state: "idle" })
  const planSaverRef = useRef(null)

  const [preferences, setPreferences] = useState(() => loadPreferences(browserStorage()))
  const isNarrow = useMediaQuery(NARROW_VIEWPORT)
  const layout = resolveLayout(preferences.layout, isNarrow)
  const units = preferences.units
  const restNotify = useRestNotifications(preferences.restNotify === "on")
  const notifyOnRestDone = restNotify.status === "on"
  const handleRestDone = useCallback(() => {
    signalRestDone()
    if (notifyOnRestDone) showRestDoneNotification()
  }, [notifyOnRestDone])
  const restTimer = useRestTimer({ onDone: handleRestDone })
  const restSeconds = restSecondsFromPreference(preferences.restTimer)
  // A workout is in progress while the workout form is open or a rest is running / just ended.
  const workout = useWorkoutInProgress(view !== "dashboard" || restTimer.running || restTimer.finished)
  const wakeLockStatus = useWakeLock(
    preferences.keepAwake === "on" || (preferences.keepAwake === "workout" && workout.active)
  )

  const filteredWorkouts = filterWorkouts(workouts, filters)
  const filtersActive = filters.type !== "all" || Boolean(filters.from || filters.to)

  const statsWorkouts = statsSource === "all" ? workouts : filteredWorkouts
  const today = todaysWorkout(weeklyPlan, workouts)
  const todaysWorkouts = workouts.filter((w) => w.date === today.date)

  useEffect(() => {
    savePreferences(browserStorage(), preferences)
  }, [preferences])

  // "OK" / "Jdu na sérii" or a new pause: the system notification is stale too.
  useEffect(() => {
    if (!restTimer.finished && notifyOnRestDone) closeRestNotifications()
  }, [restTimer.finished, notifyOnRestDone])

  // Download the chosen heading font (only that one; Settings loads the rest for its previews).
  useEffect(() => {
    loadFontTheme(preferences.font)
  }, [preferences.font])

  // AUTH (the stored user is read in useState above; Supabase confirms or clears it here)
  useEffect(() => {
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
    setLoadError("")
    setWeeklyPlan(createDefaultWeeklyPlan())
    setPlanHistory([])
    setPlanStatus({ state: "idle" })
    setPage("overview")
    localStorage.removeItem("user")
  }

  // LOAD WORKOUTS
  useEffect(() => {
    if (!user) return
    // A slow answer for an earlier user or attempt must not overwrite a newer one.
    let cancelled = false

    const fetchWorkouts = async () => {
      try {
        setLoading(true)
        setLoadError("")
        const { data, error } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", user.userId)
          .order("date", { ascending: false })

        if (error) throw error
        if (!cancelled) setWorkouts(data || [])
      } catch (err) {
        console.error("Chyba při načítání:", err)
        if (!cancelled) setLoadError("Nepovedlo se načíst tréninky: " + (err?.message || "neznámá chyba"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchWorkouts()
    return () => {
      cancelled = true
    }
  }, [user, loadAttempt])

  // LOAD WEEKLY PLAN, and set up saving it for this user
  useEffect(() => {
    if (!user) return
    const userId = user.userId
    let cancelled = false

    planSaverRef.current = createLatestSaver(
      (plan) =>
        saveWeeklyPlan(supabase, userId, plan, {
          onHistoryError: (error) => console.warn("Historie plánu se neuložila:", error),
        }),
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

    // Without the history (e.g. its migration wasn't run) the chart measures
    // every week by the current plan, so a failure here is only logged.
    const fetchHistory = async () => {
      try {
        const history = await loadPlanHistory(supabase, userId)
        if (!cancelled) setPlanHistory(history)
      } catch (err) {
        console.warn("Historii plánu se nepovedlo načíst:", err)
      }
    }

    fetchPlan()
    fetchHistory()
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

  // A new workout starts as today's: today's date and, on a training day, the
  // planned type with last time's exercises as one-tap choices ("Dnešní cviky").
  const handleNewWorkout = () => {
    resetEditing()
    setCurrentDate(today.date)
    if (today.type !== "off") {
      setCurrentType(today.type)
      setPlannedExercises(today.exerciseNames)
    }
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

  // WorkoutList asks for confirmation in the card and shows the error there, so this only
  // deletes, and rethrows a failure for the list to show.
  const handleDeleteWorkout = async (id) => {
    try {
      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.userId)

      if (error) throw new Error(error.message)

      setWorkouts((prev) => prev.filter((w) => w.id !== id))
      if (editingId === id) resetEditing()
    } catch (err) {
      console.error("Chyba při mazání:", err)
      throw err
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
      <div className="app-shell" data-accent={preferences.accent} data-font={preferences.font} data-density={preferences.density}>
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

  const emptyText = loadError
    ? "Tréninky se nenačetly."
    : filtersActive
      ? "Filtru neodpovídá žádný trénink."
      : "Zatím žádné tréninky. Přidej první!"

  const workoutList = (
    <>
      {loadError && (
        <div className="alert alert-error load-error" role="alert">
          <span>{loadError}</span>
          <button
            className="btn btn-secondary btn-small"
            type="button"
            onClick={() => setLoadAttempt((n) => n + 1)}
            disabled={loading}
          >
            Zkusit znovu
          </button>
        </div>
      )}
      <WorkoutList
        key={JSON.stringify(filters)} // a new filter starts from the first page again
        workouts={filteredWorkouts}
        units={units}
        onEdit={handleEditWorkout}
        onDelete={handleDeleteWorkout}
        emptyText={emptyText}
        pageSize={WORKOUTS_PAGE_SIZE}
      />
    </>
  )

  const chart = <ProgressChart workouts={statsWorkouts} units={units} />
  const records = <PersonalRecords workouts={statsWorkouts} units={units} />
  const plan = (
    <>
      <PlanAdherence plan={weeklyPlan} workouts={workouts} history={planHistory} />
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
    <Settings
      preferences={preferences}
      onChange={setPreferences}
      user={user}
      onLogout={handleLogout}
      workouts={workouts}
      wakeLockStatus={wakeLockStatus}
      workoutActive={workout.active}
      notifyStatus={restNotify.status}
      onEnableNotify={restNotify.enable}
    />
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
        exerciseRepRanges={preferences.exerciseRepRanges}
        onRepRangeChange={(name, range) =>
          setPreferences((p) => ({ ...p, exerciseRepRanges: withExerciseRepRange(p.exerciseRepRanges, name, range) }))
        }
        plannedExercises={plannedExercises}
        restTimer={restTimer}
        restSeconds={restSeconds}
        bar={preferences.bar}
        plates={preferences[platesKey(units)]}
        plateLoading={preferences.plateLoading}
        onPlateLoadingChange={(name, loading) =>
          setPreferences((p) => ({ ...p, plateLoading: withPlateLoading(p.plateLoading, name, loading) }))
        }
        onSave={async (values) => {
          if (await handleSave(values)) {
            workout.finish()
            setView("dashboard")
          }
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
      <div className="app-shell" data-layout="mobile" data-accent={preferences.accent} data-font={preferences.font} data-density={preferences.density}>
        <header className="m-appbar">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="brand" size={18} />
          </span>
          {/* A new element per page, so Safari repaints the whole title, not just the changed text. */}
          <h1 key={current.page} className="m-title">
            {current.label}
          </h1>
          {!dialogOpen && current.page !== "overview" && <RestTimer timer={restTimer} compact />}
          {loading && <span className="loading-dot" role="status" aria-label="Načítám tréninky" />}
        </header>

        <main className="m-main">
          {/* Gym mode: only what you need between sets. Progress is under Tréninky → Pokrok. */}
          {current.page === "overview" && (
            <>
              <RestTimerPanel
                timer={restTimer}
                restSeconds={restSeconds}
                primary={todaysWorkouts.length > 0}
              />
              <TodayCard
                today={today}
                workouts={todaysWorkouts}
                units={units}
                onEdit={handleEditWorkout}
                onStart={handleNewWorkout}
              />
            </>
          )}

          {current.page === "workouts" && (
            <>
              <div className="segmented m-view-switch" role="radiogroup" aria-label="Zobrazit">
                {[
                  { value: "list", label: "Seznam" },
                  { value: "progress", label: "Pokrok" },
                ].map((opt) => (
                  <label key={opt.value} className="segmented-option">
                    <input
                      type="radio"
                      name="workouts-view"
                      value={opt.value}
                      checked={workoutsView === opt.value}
                      onChange={() => setWorkoutsView(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {current.page === "workouts" && workoutsView === "progress" && (
            <>
              {statsSummary}
              <section className="card card-featured">
                <h2 className="card-title">Vývoj odhadu 1RM</h2>
                {chart}
              </section>
              <section className="card">
                <h2 className="card-title">Osobní rekordy</h2>
                {records}
              </section>
            </>
          )}

          {current.page === "workouts" && workoutsView === "list" && (
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
    <div className="app-shell" data-layout="desktop" data-accent={preferences.accent} data-font={preferences.font} data-density={preferences.density}>
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
          {/* Start button while idle, countdown while running. Email and logout are in Settings. */}
          {!dialogOpen && <RestTimer timer={restTimer} defaultSeconds={restSeconds ?? DEFAULT_REST_SECONDS} />}
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
              {workoutList}
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
                    { id: "plan", label: "Týdenní plán" },
                    { id: "records", label: "Osobní rekordy" },
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
