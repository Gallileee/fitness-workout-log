// src/lib/useElementSize.js
import { useCallback, useState } from "react"

// Returns [ref, { width, height }] with the element's current content size in
// CSS pixels, updated on resize. `fallback` is used until the first measurement.
// Uses a React 19 callback ref with cleanup, so it also works for elements
// that mount later (e.g. a chart that only renders once there is data).
export function useElementSize(fallback) {
  const [size, setSize] = useState(fallback)
  const ref = useCallback((node) => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      if (width > 0 && height > 0) {
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, size]
}
