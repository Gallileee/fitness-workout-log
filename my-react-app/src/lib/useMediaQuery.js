// src/lib/useMediaQuery.js
import { useCallback, useSyncExternalStore } from "react"

// true while the CSS media query matches; re-renders when it changes
// (window resize, rotation, browser zoom).
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
