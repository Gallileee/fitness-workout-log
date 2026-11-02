// Runs before every test file (vite.config.js → test.setupFiles).
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// jsdom has no layout engine, so it lacks these browser APIs. Minimal stand-ins:
// no media query matches (the app picks the desktop layout) and sizes never change.
window.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
})

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Unmount rendered components and clear storage, so tests can't affect each other.
afterEach(() => {
  cleanup()
  localStorage.clear()
})
