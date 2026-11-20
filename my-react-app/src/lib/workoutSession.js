// src/lib/workoutSession.js
// Whether a workout is in progress, for "keep the screen on during a workout".
// The app has no explicit "start workout" button, so it goes by what the lifter
// does: the workout form is open, or a rest is running (or has just ended and
// still says "Pauza skončila"). Between those, e.g. while doing a set after
// dismissing the rest, the workout still counts for a grace period, so the phone
// doesn't lock mid-set. Saving the workout ends it without the grace period.
import { useCallback, useEffect, useState } from "react"

export const WORKOUT_GRACE_MS = 5 * 60_000

// busy: the form is open or the rest timer is running / finished.
// Returns { active, finish }; call finish() when the workout is saved.
export function useWorkoutInProgress(busy, { graceMs = WORKOUT_GRACE_MS } = {}) {
  const [prevBusy, setPrevBusy] = useState(busy)
  const [lingering, setLingering] = useState(false)
  // Saved during this busy stretch: when it ends, there is no grace period.
  const [finished, setFinished] = useState(false)

  // Adjusted during render (not in an effect), so `active` never drops to false
  // for a moment between busy and the grace period, which would release the lock.
  // The value for this render, also in the render React redoes with the new state.
  let lingeringNow = lingering
  if (busy !== prevBusy) {
    lingeringNow = !busy && !finished
    setPrevBusy(busy)
    setLingering(lingeringNow)
    setFinished(false)
  }

  useEffect(() => {
    if (!lingering) return
    const id = setTimeout(() => setLingering(false), graceMs)
    return () => clearTimeout(id)
  }, [lingering, graceMs])

  const finish = useCallback(() => {
    setFinished(true)
    setLingering(false)
  }, [])

  return { active: busy || lingeringNow, finish }
}
