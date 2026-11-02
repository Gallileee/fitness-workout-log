// src/components/RestTimerPanel.jsx
// The big rest timer on the mobile overview, made to be used between sets:
// a large clock, and buttons big enough to hit with a thumb without looking twice.
// `timer` comes from useRestTimer() in App, so it is the same timer as everywhere else.
import { formatClock, DEFAULT_REST_SECONDS } from "../lib/restTimer"

const PRESETS = [60, 90, 120, 180]

function RestTimerPanel({ timer, restSeconds }) {
  const defaultSeconds = restSeconds ?? DEFAULT_REST_SECONDS

  if (timer.running) {
    return (
      <section className="card card-featured rest-panel is-running" aria-label="Pauza">
        <div className="rest-panel-label">Pauza</div>
        <div className="rest-panel-clock" role="timer" aria-label="Zbývající pauza">
          {formatClock(timer.remaining)}
        </div>
        <div className="rest-panel-actions">
          <button type="button" className="btn btn-secondary rest-panel-btn" onClick={() => timer.addTime(30)}>
            +30 s
          </button>
          <button type="button" className="btn btn-ghost rest-panel-btn" onClick={timer.stop}>
            Zastavit
          </button>
        </div>
      </section>
    )
  }

  if (timer.finished) {
    return (
      <section className="card rest-panel is-finished" aria-label="Pauza">
        <div className="rest-panel-clock" role="status">
          Pauza skončila
        </div>
        <div className="rest-panel-actions">
          <button type="button" className="btn btn-primary rest-panel-btn" onClick={timer.dismiss}>
            Jdu na sérii
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card rest-panel" aria-label="Pauza">
      <div className="rest-panel-label">Pauza</div>
      <button
        type="button"
        className="btn btn-primary rest-panel-start"
        onClick={() => timer.start(defaultSeconds)}
      >
        Spustit {formatClock(defaultSeconds)}
      </button>
      <div className="rest-panel-presets" role="group" aria-label="Jiná délka pauzy">
        {PRESETS.filter((s) => s !== defaultSeconds).map((s) => (
          <button key={s} type="button" className="btn btn-secondary rest-panel-btn" onClick={() => timer.start(s)}>
            {formatClock(s)}
          </button>
        ))}
      </div>
    </section>
  )
}

export default RestTimerPanel
