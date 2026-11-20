import { describe, test, expect, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
  NOTIFICATION_TAG,
  SERVICE_WORKER_URL,
  closeRestNotifications,
  permissionOf,
  requestPermission,
  restWorker,
  showRestDoneNotification,
  useRestNotifications,
} from "./restNotification"

// A Notification constructor with a settable permission that records what was shown.
function fakeNotification(permission = "granted", { answer = "granted", callbackOnly = false, throws = false } = {}) {
  const shown = []
  function Notification(title, options) {
    if (throws) throw new TypeError("Illegal constructor")
    this.title = title
    this.options = options
    this.close = vi.fn()
    shown.push(this)
  }
  Notification.permission = permission
  Notification.requestPermission = vi.fn((callback) => {
    Notification.permission = answer
    if (callbackOnly) {
      callback(answer)
      return undefined
    }
    return Promise.resolve(answer)
  })
  Notification.shown = shown
  return Notification
}

// navigator.serviceWorker with an optional existing registration.
function fakeServiceWorker({ registered = true, showFails = false } = {}) {
  const open = []
  const registration = {
    showNotification: vi.fn(async (title, options) => {
      if (showFails) throw new TypeError("No active registration")
      open.push({ title, options, close: vi.fn() })
    }),
    getNotifications: vi.fn(async ({ tag }) => open.filter((n) => n.options.tag === tag)),
  }
  return {
    registration,
    open,
    getRegistration: vi.fn(async () => (registered ? registration : undefined)),
    register: vi.fn(async () => registration),
  }
}

function fakeDoc(visibilityState = "hidden") {
  const listeners = new Set()
  return {
    visibilityState,
    addEventListener: (type, fn) => type === "visibilitychange" && listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    show() {
      this.visibilityState = "visible"
      for (const fn of listeners) fn()
    },
    listeners,
  }
}

describe("permissionOf", () => {
  test("reads the permission, unsupported without the API", () => {
    expect(permissionOf(undefined)).toBe("unsupported")
    expect(permissionOf(fakeNotification("granted"))).toBe("granted")
    expect(permissionOf(fakeNotification("denied"))).toBe("denied")
    expect(permissionOf(fakeNotification("default"))).toBe("default")
    expect(permissionOf(fakeNotification("something new"))).toBe("default")
  })
})

describe("requestPermission", () => {
  test("asks only when the browser hasn't got an answer yet", async () => {
    const granted = fakeNotification("granted")
    expect(await requestPermission(granted)).toBe("granted")
    expect(granted.requestPermission).not.toHaveBeenCalled()

    const asked = fakeNotification("default", { answer: "denied" })
    expect(await requestPermission(asked)).toBe("denied")
    expect(asked.requestPermission).toHaveBeenCalledOnce()
  })

  test("works with the old callback form (Safari before 15)", async () => {
    expect(await requestPermission(fakeNotification("default", { callbackOnly: true }))).toBe("granted")
  })

  test("a dismissed prompt stays default, a throwing API doesn't break", async () => {
    expect(await requestPermission(fakeNotification("default", { answer: "default" }))).toBe("default")
    const broken = fakeNotification("default")
    broken.requestPermission = () => {
      throw new Error("not allowed")
    }
    expect(await requestPermission(broken)).toBe("default")
    expect(await requestPermission(undefined)).toBe("unsupported")
  })
})

describe("restWorker", () => {
  test("reuses the registration or registers the worker", async () => {
    const existing = fakeServiceWorker()
    expect(await restWorker(existing)).toBe(existing.registration)
    expect(existing.register).not.toHaveBeenCalled()

    const fresh = fakeServiceWorker({ registered: false })
    expect(await restWorker(fresh)).toBe(fresh.registration)
    expect(fresh.register).toHaveBeenCalledWith(SERVICE_WORKER_URL)
  })

  test("is null without service workers or when registering fails", async () => {
    expect(await restWorker(undefined)).toBeNull()
    const failing = fakeServiceWorker({ registered: false })
    failing.register.mockRejectedValue(new Error("insecure"))
    expect(await restWorker(failing)).toBeNull()
  })
})

describe("showRestDoneNotification", () => {
  test("shows it through the service worker when the page is hidden", async () => {
    const serviceWorker = fakeServiceWorker()
    const Notification = fakeNotification()
    expect(await showRestDoneNotification({ Notification, serviceWorker, doc: fakeDoc("hidden") })).toBe(true)
    expect(serviceWorker.open).toHaveLength(1)
    expect(serviceWorker.open[0].title).toBe("Pauza skončila")
    expect(serviceWorker.open[0].options).toMatchObject({ tag: NOTIFICATION_TAG, renotify: true })
    expect(Notification.shown).toHaveLength(0)
  })

  test("stays quiet while the app is on screen: it shows Pauza skončila itself", async () => {
    const serviceWorker = fakeServiceWorker()
    expect(await showRestDoneNotification({ Notification: fakeNotification(), serviceWorker, doc: fakeDoc("visible") })).toBe(false)
    expect(serviceWorker.open).toHaveLength(0)
  })

  test("stays quiet without permission", async () => {
    for (const permission of ["default", "denied"]) {
      const serviceWorker = fakeServiceWorker()
      const shown = await showRestDoneNotification({
        Notification: fakeNotification(permission),
        serviceWorker,
        doc: fakeDoc("hidden"),
      })
      expect(shown).toBe(false)
      expect(serviceWorker.open).toHaveLength(0)
    }
    expect(await showRestDoneNotification({ Notification: undefined, serviceWorker: undefined, doc: fakeDoc() })).toBe(false)
  })

  test("falls back to a page notification without a worker, closed by a click", async () => {
    const Notification = fakeNotification()
    const focus = vi.spyOn(window, "focus").mockImplementation(() => {})
    expect(await showRestDoneNotification({ Notification, serviceWorker: undefined, doc: fakeDoc() })).toBe(true)
    expect(Notification.shown).toHaveLength(1)
    Notification.shown[0].onclick()
    expect(focus).toHaveBeenCalled()
    expect(Notification.shown[0].close).toHaveBeenCalled()
  })

  test("falls back when the worker can't show it, and never throws", async () => {
    const Notification = fakeNotification()
    const serviceWorker = fakeServiceWorker({ showFails: true })
    expect(await showRestDoneNotification({ Notification, serviceWorker, doc: fakeDoc() })).toBe(true)
    expect(Notification.shown).toHaveLength(1)

    // Android Chrome without a worker: the constructor throws.
    const illegal = fakeNotification("granted", { throws: true })
    expect(await showRestDoneNotification({ Notification: illegal, serviceWorker: undefined, doc: fakeDoc() })).toBe(false)
  })
})

describe("closeRestNotifications", () => {
  test("closes the worker's rest notifications", async () => {
    const serviceWorker = fakeServiceWorker()
    await showRestDoneNotification({ Notification: fakeNotification(), serviceWorker, doc: fakeDoc() })
    await closeRestNotifications({ serviceWorker })
    expect(serviceWorker.registration.getNotifications).toHaveBeenCalledWith({ tag: NOTIFICATION_TAG })
    expect(serviceWorker.open[0].close).toHaveBeenCalled()
  })

  test("does nothing without a worker", async () => {
    await expect(closeRestNotifications({ serviceWorker: undefined })).resolves.toBeUndefined()
    const broken = fakeServiceWorker()
    broken.getRegistration.mockRejectedValue(new Error("gone"))
    await expect(closeRestNotifications({ serviceWorker: broken })).resolves.toBeUndefined()
  })
})

describe("useRestNotifications", () => {
  test("is unsupported without the API, off while the setting is off", () => {
    const doc = fakeDoc("visible")
    expect(renderHook(() => useRestNotifications(true, { Notification: undefined, doc })).result.current.status).toBe("unsupported")
    const { result } = renderHook(() => useRestNotifications(false, { Notification: fakeNotification(), doc }))
    expect(result.current.status).toBe("off")
  })

  test("follows the permission while on", () => {
    const doc = fakeDoc("visible")
    const status = (permission) =>
      renderHook(() => useRestNotifications(true, { Notification: fakeNotification(permission), doc })).result.current.status
    expect(status("granted")).toBe("on")
    expect(status("denied")).toBe("blocked")
    expect(status("default")).toBe("ask")
  })

  test("says blocked even while off, and notices when it's allowed again", async () => {
    const Notification = fakeNotification("denied")
    const doc = fakeDoc("hidden")
    const { result } = renderHook(() => useRestNotifications(false, { Notification, doc }))
    expect(result.current.status).toBe("blocked")
    Notification.permission = "default" // reset in the site settings meanwhile
    await act(async () => doc.show())
    expect(result.current.status).toBe("off")
  })

  test("enable() asks and registers the worker once granted", async () => {
    const Notification = fakeNotification("default")
    const serviceWorker = fakeServiceWorker({ registered: false })
    const env = { Notification, serviceWorker, doc: fakeDoc("visible") }
    const { result, rerender } = renderHook(({ on }) => useRestNotifications(on, env), { initialProps: { on: false } })

    rerender({ on: true })
    expect(result.current.status).toBe("ask")
    let answer
    await act(async () => {
      answer = await result.current.enable()
    })
    expect(answer).toBe("granted")
    expect(result.current.status).toBe("on")
    expect(serviceWorker.register).toHaveBeenCalled()
  })

  test("on return to the app: re-reads the permission and closes the notification", async () => {
    const Notification = fakeNotification("granted")
    const serviceWorker = fakeServiceWorker()
    const doc = fakeDoc("hidden")
    const { result, unmount } = renderHook(() => useRestNotifications(true, { Notification, serviceWorker, doc }))
    await act(() => showRestDoneNotification({ Notification, serviceWorker, doc }))

    Notification.permission = "denied" // changed in the site settings meanwhile
    await act(async () => doc.show())
    expect(result.current.status).toBe("blocked")
    expect(serviceWorker.open[0].close).toHaveBeenCalled()

    unmount()
    expect(doc.listeners.size).toBe(0)
  })
})
