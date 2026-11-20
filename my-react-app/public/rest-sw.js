// public/rest-sw.js
// Service worker for the rest-timer notification only (src/lib/restNotification.js).
// Android Chrome shows page notifications only through a service worker.
// It caches nothing and doesn't handle fetches, so it never serves a stale app.

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

// A tap on "Pauza skončila" brings the app back (or opens it if it was closed).
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.registration.scope))
      return open ? open.focus() : self.clients.openWindow(self.registration.scope)
    }),
  )
})
