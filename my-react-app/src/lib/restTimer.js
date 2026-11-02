// src/lib/restTimer.js
// Rest timer between sets / exercises. The timer stores when it ends rather
// than counting ticks, so it stays correct when the browser slows down
// intervals (background tabs, a locked phone screen).
import { useCallback, useEffect, useRef, useState } from "react"

export const DEFAULT_REST_SECONDS = 90

// Whole seconds left until `endsAt` (ms timestamp), rounded up, never negative:
// 89.2 s left shows as 1:30 until a full second has passed.
export function remainingSeconds(endsAt, now) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

// 90 -> "1:30", 5 -> "0:05".
export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

// The rest-timer preference ("off", "60", "90", ...) -> seconds, or null when off.
export function restSecondsFromPreference(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

// Vibrates (where supported) and plays a short beep. Never throws: browsers
// without these APIs, or that block audio until the user interacts, just stay quiet.
export function signalRestDone() {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // vibration not allowed
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    osc.onended = () => ctx.close()
  } catch {
    // audio not available
  }
}

// { running, finished, remaining, start(seconds), addTime(seconds), stop(), dismiss() }
// `finished` stays true after the countdown ends until dismissed or restarted.
// The interval checks 4× a second, but state (and so a re-render) only
// changes when the displayed number of seconds does.
export function useRestTimer({ onDone } = {}) {
  const [endsAt, setEndsAt] = useState(null)
  const [remaining, setRemaining] = useState(0)
  const [finished, setFinished] = useState(false)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (endsAt === null) return
    const id = setInterval(() => {
      const left = remainingSeconds(endsAt, Date.now())
      setRemaining(left)
      if (left === 0) {
        setEndsAt(null)
        setFinished(true)
        onDoneRef.current?.()
      }
    }, 250)
    return () => clearInterval(id)
  }, [endsAt])

  const start = useCallback((seconds) => {
    setFinished(false)
    setRemaining(seconds)
    setEndsAt(Date.now() + seconds * 1000)
  }, [])

  const addTime = useCallback(
    (seconds) => {
      if (endsAt === null) return
      setEndsAt(endsAt + seconds * 1000)
      setRemaining((prev) => prev + seconds)
    },
    [endsAt]
  )

  const stop = useCallback(() => {
    setEndsAt(null)
    setRemaining(0)
    setFinished(false)
  }, [])

  const dismiss = useCallback(() => setFinished(false), [])

  return { running: endsAt !== null, finished, remaining, start, addTime, stop, dismiss }
}
