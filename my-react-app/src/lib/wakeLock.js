// src/lib/wakeLock.js
// Keeps the phone screen on while the app is open (Screen Wake Lock API), so it
// doesn't lock between sets. The browser drops the lock whenever the tab is
// hidden, so it is requested again each time the page becomes visible.
import { useEffect, useState } from "react"

// navigator.wakeLock, or undefined in browsers without the API (and outside
// a secure context: it needs https or localhost).
export function browserWakeLock() {
  return typeof navigator === "undefined" ? undefined : navigator.wakeLock
}

// status: "unsupported" | "off" | "pending" | "active" | "error"
// The status is shown in Settings so the lifter knows whether the toggle works here.
export function useWakeLock(enabled, { wakeLock = browserWakeLock(), doc = globalThis.document } = {}) {
  // State of the lock while the setting is on; set only from the browser's callbacks.
  const [lockState, setLockState] = useState("pending")

  useEffect(() => {
    if (!wakeLock || !enabled) return

    let sentinel = null
    let requesting = false
    let cancelled = false

    async function acquire() {
      if (requesting || doc.visibilityState !== "visible" || (sentinel && !sentinel.released)) return
      requesting = true
      try {
        const lock = await wakeLock.request("screen")
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        sentinel = lock
        setLockState("active")
        // Fired when the browser releases it (tab hidden, battery saver) or we do.
        lock.addEventListener("release", () => {
          if (!cancelled) setLockState("pending")
        })
      } catch {
        // Denied, e.g. by a permissions policy or low battery. Not worth an alert.
        if (!cancelled) setLockState("error")
      } finally {
        requesting = false
      }
    }

    acquire()
    doc.addEventListener("visibilitychange", acquire)
    return () => {
      cancelled = true
      doc.removeEventListener("visibilitychange", acquire)
      sentinel?.release().catch(() => {})
      setLockState("pending")
    }
  }, [enabled, wakeLock, doc])

  if (!wakeLock) return "unsupported"
  return enabled ? lockState : "off"
}
