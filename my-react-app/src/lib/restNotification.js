// src/lib/restNotification.js
// A system notification when the rest timer ends while the app is in the
// background (another tab, another app on the phone), where the in-app
// "Pauza skončila" and the beep can be missed.
//
// Android Chrome doesn't allow `new Notification()` from a page, only
// `registration.showNotification()` from a service worker, so a tiny worker
// (public/rest-sw.js, no caching) is registered once the setting is on.
import { useCallback, useEffect, useState } from "react"

export const NOTIFICATION_TAG = "rest-timer"
export const SERVICE_WORKER_URL = "rest-sw.js"

const TITLE = "Pauza skončila"
const OPTIONS = {
  body: "Čas na další sérii.",
  tag: NOTIFICATION_TAG,
  // Replacing an older one (same tag) should still buzz.
  renotify: true,
  lang: "cs",
}

// The browser APIs this module uses, overridable in tests.
export function browserEnv() {
  return {
    Notification: typeof window === "undefined" ? undefined : window.Notification,
    serviceWorker: typeof navigator === "undefined" ? undefined : navigator.serviceWorker,
    doc: globalThis.document,
  }
}

// "unsupported" | "default" | "granted" | "denied"
export function permissionOf(Notification) {
  if (!Notification) return "unsupported"
  const p = Notification.permission
  return p === "granted" || p === "denied" ? p : "default"
}

// Asks for permission. Must run from a click: browsers ignore or block requests
// made without one. Older Safari only takes a callback, so both forms are handled.
export async function requestPermission(Notification) {
  if (!Notification) return "unsupported"
  if (permissionOf(Notification) !== "default") return permissionOf(Notification)
  try {
    const answer = await new Promise((resolve) => {
      const result = Notification.requestPermission(resolve)
      if (result && typeof result.then === "function") result.then(resolve, () => resolve("default"))
    })
    return answer === "granted" || answer === "denied" ? answer : "default"
  } catch {
    return permissionOf(Notification)
  }
}

// The worker's registration, registering it if needed; null where there are no
// service workers (plain http, Firefox private windows) or registering fails.
export async function restWorker(serviceWorker) {
  if (!serviceWorker) return null
  try {
    return (await serviceWorker.getRegistration()) ?? (await serviceWorker.register(SERVICE_WORKER_URL))
  } catch {
    return null
  }
}

// Shows "Pauza skončila" if the page is hidden and permission was granted.
// Returns true when a notification was shown. Never throws.
export async function showRestDoneNotification(env = browserEnv()) {
  const { Notification, serviceWorker, doc } = env
  if (doc?.visibilityState !== "hidden" || permissionOf(Notification) !== "granted") return false

  const registration = await restWorker(serviceWorker)
  if (registration?.showNotification) {
    try {
      await registration.showNotification(TITLE, OPTIONS)
      return true
    } catch {
      // fall through to the page notification
    }
  }
  try {
    const notification = new Notification(TITLE, OPTIONS)
    notification.onclick = () => {
      globalThis.focus?.()
      notification.close()
    }
    return true
  } catch {
    // Android Chrome without a worker: "Illegal constructor".
    return false
  }
}

// Closes a shown rest notification, e.g. once the lifter is back in the app.
// Page notifications with the same tag are replaced, not stacked, so only the
// worker's need closing here; a page one is closed by its click or the system.
export async function closeRestNotifications(env = browserEnv()) {
  try {
    const registration = await env.serviceWorker?.getRegistration()
    const shown = (await registration?.getNotifications?.({ tag: NOTIFICATION_TAG })) ?? []
    for (const n of shown) n.close()
  } catch {
    // nothing to close
  }
}

// status: "unsupported" | "off" | "ask" | "on" | "blocked" (also while off)
// enable(): asks for permission (call it from the click that turns the setting on).
// While on, the worker is registered and a notification is closed when the page
// becomes visible again, because the app then shows "Pauza skončila" itself.
export function useRestNotifications(enabled, env = browserEnv()) {
  const { Notification, serviceWorker, doc } = env
  const [permission, setPermission] = useState(() => permissionOf(Notification))

  useEffect(() => {
    if (!Notification || (!enabled && permission !== "denied")) return
    // Permission can change in the browser's site settings while the app is open.
    const onVisible = () => {
      if (doc.visibilityState !== "visible") return
      setPermission(permissionOf(Notification))
      closeRestNotifications({ serviceWorker })
    }
    if (enabled && permission === "granted") restWorker(serviceWorker)
    doc.addEventListener("visibilitychange", onVisible)
    return () => doc.removeEventListener("visibilitychange", onVisible)
  }, [enabled, permission, Notification, serviceWorker, doc])

  const enable = useCallback(async () => {
    const answer = await requestPermission(Notification)
    setPermission(answer)
    if (answer === "granted") restWorker(serviceWorker)
    return answer
  }, [Notification, serviceWorker])

  // A block is shown even while off: switching on wouldn't ask, the browser just says no.
  let status
  if (permission === "unsupported") status = "unsupported"
  else if (permission === "denied") status = "blocked"
  else if (!enabled) status = "off"
  else status = { granted: "on", denied: "blocked", default: "ask" }[permission]
  return { status, enable }
}
