// src/components/PlanAdherence.jsx
import { currentWeekStatus, weeklyAdherence, completedWeekStreak } from "../lib/adherence"
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
// `workouts` should be all workouts, not the filtered list.
function PlanAdherence({ plan, workouts, today = new Date() }) {
  const days = currentWeekStatus(plan, workouts, today)
  const weeks = weeklyAdherence(plan, workouts, { weeks: WEEKS, today })
  const thisWeek = weeks[weeks.length - 1]
  const streak = completedWeekStreak(weeks)

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
          <li key={d.date} className={`adherence-day is-${d.status}`} title={dayTitle(d)}>
            <span className="adherence-day-name" aria-hidden="true">
              {d.day.slice(0, 2)}
            </span>
            <span className="adherence-mark" aria-hidden="true">
              {STATUS[d.status].mark}
            </span>
            <span className="visually-hidden">{dayTitle(d)}</span>
          </li>
        ))}
      </ol>

      <div className="adherence-weeks" role="img" aria-label={weeksSummary(weeks)}>
        {weeks.map((w) => (
          <div
            key={w.weekStart}
            className={`adherence-week ${w.current ? "is-current" : ""} ${w.ratio === 1 ? "is-complete" : ""}`}
            title={`Týden od ${shortDate(w.weekStart)}: ${w.completed} z ${w.planned}`}
          >
            <div className="adherence-bar-track">
              <div className="adherence-bar" style={{ height: `${Math.round(w.ratio * 100)}%` }} />
            </div>
            <span className="adherence-week-label">{shortDate(w.weekStart)}</span>
          </div>
        ))}
      </div>
      <p className="muted small adherence-note">
        Trénink se počítá, když je v daném týdnu zapsaný stejný typ, i v jiný den. Starší týdny se měří podle
        současného plánu.
      </p>
    </div>
  )
}

function weeksSummary(weeks) {
  return `Plnění plánu za posledních ${weeks.length} týdnů: ${weeks
    .map((w) => `od ${shortDate(w.weekStart)} ${w.completed} z ${w.planned}`)
    .join(", ")}`
}

export default PlanAdherence
