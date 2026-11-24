// src/components/PlanAdherence.jsx
import { useState } from "react"
import { currentWeekStatus, weeklyAdherence, completedWeekStreak, toIsoDate } from "../lib/adherence"
import { parseLocalDate } from "../lib/stats"
import { workoutTypeLabel } from "../lib/workoutTypes"

const WEEKS = 8

const STATUS = {
  done: { mark: "✓", label: "Splněno" },
  other: { mark: "~", label: "Jiný trénink" },
  missed: { mark: "×", label: "Vynecháno" },
  today: { mark: "•", label: "Dnes na plánu" },
  upcoming: { mark: "", label: "Naplánováno" },
  rest: { mark: "–", label: "Volno" },
  extra: { mark: "+", label: "Trénink navíc" },
}

function weeksLabel(n) {
  if (n === 1) return "1 týden"
  if (n >= 2 && n <= 4) return `${n} týdny`
  return `${n} týdnů`
}

function shortDate(iso) {
  return parseLocalDate(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })
}

function dayTitle(d) {
  const planned = d.planned === "off" ? "volno" : workoutTypeLabel(d.planned)
  const logged = d.logged.length ? `, zapsáno: ${d.logged.map(workoutTypeLabel).join(", ")}` : ""
  return `${d.day} ${shortDate(d.date)}: ${STATUS[d.status].label} (plán: ${planned}${logged})`
}

// This week day by day, the last weeks as bars, and the streak of complete weeks.
// `workouts` should be all workouts, not the filtered list. `history` holds the
// plans of past weeks (see lib/planHistory.js); without it every week uses `plan`.
// Every day and week is a button: tapping one shows its result in the line under
// the chart, since touch screens have no hover tooltips. Tapping it again goes
// back to today's day.
function PlanAdherence({ plan, workouts, history = [], today = new Date() }) {
  const days = currentWeekStatus(plan, workouts, today)
  const weeks = weeklyAdherence(plan, workouts, { weeks: WEEKS, today, history })
  const thisWeek = weeks[weeks.length - 1]
  const streak = completedWeekStreak(weeks)
  const [selected, setSelected] = useState(null) // "day:YYYY-MM-DD" | "week:YYYY-MM-DD" | null

  const toggle = (key) => setSelected((current) => (current === key ? null : key))
  const selectedDay = days.find((d) => selected === `day:${d.date}`)
  const selectedWeek = weeks.find((w) => selected === `week:${w.weekStart}`)
  const todayDay = days.find((d) => d.date === toIsoDate(today))
  const detail = dayTitle(selectedDay ?? todayDay)
  const detailText = selectedWeek ? weekTitle(selectedWeek) : detail

  if (thisWeek.planned === 0) {
    return <p className="muted small adherence-empty">V plánu nejsou žádné tréninky, není co vyhodnocovat.</p>
  }

  return (
    <div className="adherence">
      <div className="adherence-head">
        <div>
          <div className="adherence-label">Tento týden</div>
          <div className="adherence-value">
            {thisWeek.completed} / {thisWeek.planned}
          </div>
        </div>
        <div className="adherence-streak">
          <div className="adherence-label">Splněné týdny v řadě</div>
          <div className="adherence-value">{weeksLabel(streak)}</div>
        </div>
      </div>

      <ol className="adherence-days" aria-label="Plnění plánu tento týden">
        {days.map((d) => (
          <li key={d.date}>
            <button
              type="button"
              className={`adherence-day is-${d.status}`}
              aria-pressed={selected === `day:${d.date}`}
              onClick={() => toggle(`day:${d.date}`)}
            >
              <span className="adherence-day-name" aria-hidden="true">
                {d.day.slice(0, 2)}
              </span>
              <span className="adherence-mark" aria-hidden="true">
                {STATUS[d.status].mark}
              </span>
              <span className="visually-hidden">{dayTitle(d)}</span>
            </button>
          </li>
        ))}
      </ol>

      <ol className="adherence-weeks" aria-label={`Plnění plánu za posledních ${weeks.length} týdnů`}>
        {weeks.map((w) => (
          <li key={w.weekStart}>
            <button
              type="button"
              className={weekClass(w)}
              aria-pressed={selected === `week:${w.weekStart}`}
              onClick={() => toggle(`week:${w.weekStart}`)}
            >
              <span className="adherence-bar-track" aria-hidden="true">
                <span className="adherence-bar" style={{ height: `${Math.round((w.ratio ?? 0) * 100)}%` }} />
              </span>
              <span className="adherence-week-label" aria-hidden="true">
                {shortDate(w.weekStart)}
              </span>
              <span className="visually-hidden">{weekTitle(w)}</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="adherence-detail" aria-live="polite">
        {detailText}
      </p>
      <p className="muted small adherence-note">
        Trénink se počítá, když je v daném týdnu zapsaný stejný typ, i v jiný den.{" "}
        {history.length
          ? "Každý týden se měří podle plánu, který tehdy platil."
          : "Starší týdny se měří podle současného plánu."}
      </p>
    </div>
  )
}

function weekClass(w) {
  const classes = ["adherence-week"]
  if (w.current) classes.push("is-current")
  if (w.ratio === 1) classes.push("is-complete")
  if (w.planned === 0) classes.push("is-unplanned")
  return classes.join(" ")
}

function weekResult(w) {
  return w.planned === 0 ? "bez plánovaných tréninků" : `${w.completed} z ${w.planned}`
}

function weekTitle(w) {
  return `${w.current ? "Tento týden" : "Týden"} od ${shortDate(w.weekStart)}: ${weekResult(w)}`
}

export default PlanAdherence
