import { describe, test, expect, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useWakeLock } from "./wakeLock"

// A fake navigator.wakeLock: request() resolves to a sentinel the test can
// release, like the browser does when the tab is hidden.
function fakeWakeLock({ fail = false } = {}) {
  const sentinels = []
  const wakeLock = {
    request: vi.fn(async (type) => {
      if (fail) throw new DOMException("Denied", "NotAllowedError")
      const target = new EventTarget()
      const sentinel = Object.assign(target, {
        type,
        released: false,
        release: vi.fn(async () => {
          if (sentinel.released) return
          sentinel.released = true
          sentinel.dispatchEvent(new Event("release"))
        }),
      })
      sentinels.push(sentinel)
      return sentinel
    }),
  }
  return { wakeLock, sentinels }
}

function fakeDocument(visibilityState = "visible") {
  return Object.assign(new EventTarget(), { visibilityState })
}

describe("useWakeLock", () => {
  test("reports unsupported and does nothing without the API", () => {
    const { result } = renderHook(() => useWakeLock(true, { wakeLock: undefined, doc: fakeDocument() }))
    expect(result.current).toBe("unsupported")
  })

  test("doesn't request a lock while the setting is off", () => {
    const { wakeLock } = fakeWakeLock()
    const { result } = renderHook(() => useWakeLock(false, { wakeLock, doc: fakeDocument() }))
    expect(result.current).toBe("off")
    expect(wakeLock.request).not.toHaveBeenCalled()
  })

  test("requests a screen lock when on, and releases it when turned off", async () => {
    const { wakeLock, sentinels } = fakeWakeLock()
    const doc = fakeDocument()
    const { result, rerender } = renderHook(({ on }) => useWakeLock(on, { wakeLock, doc }), {
      initialProps: { on: true },
    })
    await waitFor(() => expect(result.current).toBe("active"))
    expect(wakeLock.request).toHaveBeenCalledWith("screen")

    rerender({ on: false })
    expect(result.current).toBe("off")
    expect(sentinels[0].release).toHaveBeenCalled()
  })

  test("requests the lock again when the tab becomes visible", async () => {
    const { wakeLock, sentinels } = fakeWakeLock()
    const doc = fakeDocument()
    const { result } = renderHook(() => useWakeLock(true, { wakeLock, doc }))
    await waitFor(() => expect(result.current).toBe("active"))

    // The browser drops the lock when the tab is hidden.
    doc.visibilityState = "hidden"
    await act(() => sentinels[0].release())
    act(() => doc.dispatchEvent(new Event("visibilitychange")))
    expect(result.current).toBe("pending")
    expect(wakeLock.request).toHaveBeenCalledTimes(1)

    doc.visibilityState = "visible"
    act(() => doc.dispatchEvent(new Event("visibilitychange")))
    await waitFor(() => expect(result.current).toBe("active"))
    expect(wakeLock.request).toHaveBeenCalledTimes(2)
  })

  test("doesn't stack locks when visibilitychange fires while one is held", async () => {
    const { wakeLock } = fakeWakeLock()
    const doc = fakeDocument()
    const { result } = renderHook(() => useWakeLock(true, { wakeLock, doc }))
    await waitFor(() => expect(result.current).toBe("active"))
    act(() => doc.dispatchEvent(new Event("visibilitychange")))
    expect(wakeLock.request).toHaveBeenCalledTimes(1)
  })

  test("doesn't send a second request while the first is pending", async () => {
    const { wakeLock } = fakeWakeLock()
    const doc = fakeDocument()
    const { result } = renderHook(() => useWakeLock(true, { wakeLock, doc }))
    act(() => doc.dispatchEvent(new Event("visibilitychange")))
    await waitFor(() => expect(result.current).toBe("active"))
    expect(wakeLock.request).toHaveBeenCalledTimes(1)
  })

  test("waits for the page to be visible before requesting", async () => {
    const { wakeLock } = fakeWakeLock()
    const doc = fakeDocument("hidden")
    const { result } = renderHook(() => useWakeLock(true, { wakeLock, doc }))
    expect(result.current).toBe("pending")
    expect(wakeLock.request).not.toHaveBeenCalled()
  })

  test("reports an error when the browser refuses", async () => {
    const { wakeLock } = fakeWakeLock({ fail: true })
    const { result } = renderHook(() => useWakeLock(true, { wakeLock, doc: fakeDocument() }))
    await waitFor(() => expect(result.current).toBe("error"))
  })

  test("releases the lock on unmount", async () => {
    const { wakeLock, sentinels } = fakeWakeLock()
    const { result, unmount } = renderHook(() => useWakeLock(true, { wakeLock, doc: fakeDocument() }))
    await waitFor(() => expect(result.current).toBe("active"))
    unmount()
    expect(sentinels[0].release).toHaveBeenCalled()
  })
})
