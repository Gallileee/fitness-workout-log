import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import {
  remainingSeconds,
  formatClock,
  restSecondsFromPreference,
  signalRestDone,
  useRestTimer,
} from "./restTimer"
import RestTimer from "../components/RestTimer"

describe("remainingSeconds", () => {
  test("rounds up, so a started 90 s timer shows 1:30 for its first second", () => {
    expect(remainingSeconds(90_000, 0)).toBe(90)
    expect(remainingSeconds(90_000, 800)).toBe(90)
    expect(remainingSeconds(90_000, 1_000)).toBe(89)
    expect(remainingSeconds(90_000, 89_001)).toBe(1)
  })

  test("is never negative", () => {
    expect(remainingSeconds(1_000, 1_000)).toBe(0)
    expect(remainingSeconds(1_000, 60_000)).toBe(0)
  })
})

describe("formatClock", () => {
  test("formats minutes and zero-padded seconds", () => {
    expect([90, 5, 60, 600, 0, -3].map(formatClock)).toEqual(["1:30", "0:05", "1:00", "10:00", "0:00", "0:00"])
  })
})

describe("restSecondsFromPreference", () => {
  test("turns the setting into seconds, or null when off", () => {
    expect(restSecondsFromPreference("90")).toBe(90)
    expect(restSecondsFromPreference("off")).toBeNull()
    expect(restSecondsFromPreference(undefined)).toBeNull()
    expect(restSecondsFromPreference("-5")).toBeNull()
  })
})

describe("signalRestDone", () => {
  test("vibrates where supported and never throws", () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true })
    expect(() => signalRestDone()).not.toThrow() // jsdom has no AudioContext
    expect(vibrate).toHaveBeenCalledOnce()
    delete navigator.vibrate
    expect(() => signalRestDone()).not.toThrow()
  })

  test("doesn't vibrate before the user has interacted with the page", () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true })
    Object.defineProperty(navigator, "userActivation", { value: { hasBeenActive: false }, configurable: true })
    signalRestDone()
    expect(vibrate).not.toHaveBeenCalled()
    delete navigator.vibrate
    delete navigator.userActivation
  })
})

// The hook and the component together, with a fake clock.
function Harness({ onDone }) {
  const timer = useRestTimer({ onDone })
  return <RestTimer timer={timer} defaultSeconds={90} />
}

describe("useRestTimer + RestTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // fireEvent instead of user-event: clicks are synchronous, so they don't
  // wait on timers that the fake clock controls.
  const setup = (onDone = vi.fn()) => {
    render(<Harness onDone={onDone} />)
    return { onDone }
  }
  const click = (name) => fireEvent.click(screen.getByRole("button", { name }))
  const clock = () => screen.getByRole("timer").textContent
  const advance = (ms) => act(() => vi.advanceTimersByTime(ms))

  test("counts down from the default and signals when done", () => {
    const { onDone } = setup()
    click("Pauza 1:30")
    expect(clock()).toBe("1:30")

    advance(1_000)
    expect(clock()).toBe("1:29")
    advance(59_000)
    expect(clock()).toBe("0:30")
    expect(onDone).not.toHaveBeenCalled()

    advance(30_000)
    expect(screen.queryByRole("timer")).toBeNull()
    expect(screen.getByRole("status").textContent).toContain("Pauza skončila")
    expect(onDone).toHaveBeenCalledOnce()

    // Done stays until dismissed; afterwards it can be started again.
    advance(10_000)
    expect(onDone).toHaveBeenCalledOnce()
    click("OK")
    expect(screen.getByRole("button", { name: "Pauza 1:30" })).toBeTruthy()
  })

  test("+30 s extends and stop cancels without signalling", () => {
    const { onDone } = setup()
    click("Pauza 1:30")
    advance(20_000)
    click("Prodloužit pauzu o 30 sekund")
    expect(clock()).toBe("1:40")
    advance(10_000)
    expect(clock()).toBe("1:30")

    click("Zastavit pauzu")
    expect(screen.queryByRole("timer")).toBeNull()
    advance(120_000)
    expect(onDone).not.toHaveBeenCalled()
  })

  test("stays correct when the browser delays the interval", () => {
    setup()
    click("Pauza 1:30")
    // A background tab may run the interval only once a minute: the time
    // left comes from the end time, not from counting ticks.
    vi.setSystemTime(Date.now() + 60_000)
    advance(250)
    expect(clock()).toBe("0:30")
  })
})

describe("RestTimer compact", () => {
  test("shows nothing while idle", () => {
    const timer = { running: false, finished: false, remaining: 0 }
    const { container } = render(<RestTimer timer={timer} defaultSeconds={90} compact />)
    expect(container.innerHTML).toBe("")
  })
})
