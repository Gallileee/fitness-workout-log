import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useWorkoutInProgress, WORKOUT_GRACE_MS } from "./workoutSession"

describe("useWorkoutInProgress", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (busy = false) => {
    // Every value `active` takes, so a short drop to false would show up.
    const seen = []
    const hook = renderHook(
      ({ busy }) => {
        const result = useWorkoutInProgress(busy)
        seen.push(result.active)
        return result
      },
      { initialProps: { busy } },
    )
    return { ...hook, seen }
  }
  const advance = (ms) => act(() => vi.advanceTimersByTime(ms))

  test("is not active before anything happens", () => {
    const { result } = setup()
    expect(result.current.active).toBe(false)
    advance(WORKOUT_GRACE_MS * 2)
    expect(result.current.active).toBe(false)
  })

  test("is active while busy and for the grace period after, without a gap", () => {
    const { result, rerender, seen } = setup()
    rerender({ busy: true })
    expect(result.current.active).toBe(true)

    seen.length = 0
    rerender({ busy: false }) // e.g. "Jdu na sérii": the lifter does a set now
    expect(seen).not.toContain(false)
    expect(result.current.active).toBe(true)

    advance(WORKOUT_GRACE_MS - 1)
    expect(result.current.active).toBe(true)
    advance(1)
    expect(result.current.active).toBe(false)
  })

  test("a new busy moment within the grace period continues the workout", () => {
    const { result, rerender } = setup(true)
    rerender({ busy: false })
    advance(WORKOUT_GRACE_MS - 1_000)
    rerender({ busy: true }) // the next rest
    advance(5_000) // the old grace period would have ended here
    expect(result.current.active).toBe(true)

    rerender({ busy: false })
    advance(WORKOUT_GRACE_MS - 1)
    expect(result.current.active).toBe(true) // a fresh grace period
    advance(1)
    expect(result.current.active).toBe(false)
  })

  test("saving ends the workout without a grace period", () => {
    const { result, rerender } = setup(true)
    act(() => result.current.finish())
    expect(result.current.active).toBe(true) // the form is still open in this render
    rerender({ busy: false })
    expect(result.current.active).toBe(false)
  })

  test("saving while a rest still runs ends it when the rest is over", () => {
    const { result, rerender } = setup(true)
    act(() => result.current.finish()) // saved; the rest from the last exercise keeps going
    rerender({ busy: true })
    expect(result.current.active).toBe(true)
    rerender({ busy: false }) // "Pauza skončila" dismissed
    expect(result.current.active).toBe(false)
  })

  test("after a saved workout, the next one gets its grace period again", () => {
    const { result, rerender } = setup(true)
    act(() => result.current.finish())
    rerender({ busy: false })
    rerender({ busy: true })
    rerender({ busy: false })
    expect(result.current.active).toBe(true)
    advance(WORKOUT_GRACE_MS)
    expect(result.current.active).toBe(false)
  })

  test("finish() during the grace period ends it at once", () => {
    const { result, rerender } = setup(true)
    rerender({ busy: false })
    act(() => result.current.finish())
    expect(result.current.active).toBe(false)
  })
})
