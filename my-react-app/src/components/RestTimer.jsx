// src/components/RestTimer.jsx
// Shows the rest timer from useRestTimer(): a countdown with +30 s and stop,
// "Pauza skončila" when it ends, and (unless compact) a button to start one.
// compact: the small version for the top bar / app bar, hidden while idle.
import Icon from "./Icon"
import { formatClock } from "../lib/restTimer"

function RestTimer({ timer, defaultSeconds, compact = false }) {
  if (timer.finished) {
    return (
      <div className="rest-timer is-finished" role="status">
        <Icon name="timer" size={18} />
        <span>Pauza skončila</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={timer.dismiss}>
          OK
        </button>
      </div>
    )
  }

  if (timer.running) {
    return (
      <div className="rest-timer is-running">
        <Icon name="timer" size={18} />
        <span className="rest-timer-clock" role="timer" aria-label="Zbývající pauza">
          {formatClock(timer.remaining)}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-small rest-timer-extend"
          onClick={() => timer.addTime(30)}
          aria-label="Prodloužit pauzu o 30 sekund"
        >
          +30 s
        </button>
        <button type="button" className="icon-btn" onClick={timer.stop} aria-label="Zastavit pauzu">
          <Icon name="close" size={16} />
        </button>
      </div>
    )
  }

  if (compact) return null
  return (
    <button type="button" className="btn btn-ghost rest-timer-start" onClick={() => timer.start(defaultSeconds)}>
      <Icon name="timer" size={18} />
      Pauza {formatClock(defaultSeconds)}
    </button>
  )
}

export default RestTimer
