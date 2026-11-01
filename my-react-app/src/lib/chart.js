// src/lib/chart.js
// Maps a value series onto SVG coordinates. Pure, so it can be tested without a DOM.

// values: numbers in display order. Returns { points: [{ x, y }], min, max }.
// Points are spread evenly along x (one per entry, not by calendar time), and y
// is flipped because SVG's y axis grows downwards. A flat series is drawn
// through the vertical middle instead of dividing by zero.
export function scaleSeries(values, { width, height, padding = 0 }) {
  const list = (values || []).filter((v) => Number.isFinite(v))
  if (list.length === 0) return { points: [], min: null, max: null }

  const min = Math.min(...list)
  const max = Math.max(...list)
  const innerW = width - 2 * padding
  const innerH = height - 2 * padding

  const points = list.map((v, i) => ({
    x: list.length === 1 ? width / 2 : padding + (i / (list.length - 1)) * innerW,
    y: max === min ? height / 2 : padding + (1 - (v - min) / (max - min)) * innerH,
  }))
  return { points, min, max }
}
