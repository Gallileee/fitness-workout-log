// src/lib/csvExport.js
// Turns the workout list into a CSV file the owner can keep or open in a
// spreadsheet. Pure functions, tested with Vitest; the download itself is in
// Settings.
//
// Format (RFC 4180): comma separated, CRLF line endings, fields quoted only
// when they contain a comma, a quote or a line break. One row per exercise
// entry (the app stores sets × reps × weight, not single sets), oldest first.
// A workout without exercises still gets one row, so its date and note aren't
// lost. Weight is always in kg, as stored, whatever unit the app displays.
import { parseLocalDate } from "./stats.js"

export const CSV_COLUMNS = ["date", "workout_type", "exercise", "sets", "reps", "weight_kg", "note"]

// A text cell starting with one of these is run as a formula by Excel,
// LibreOffice and Google Sheets ("CSV injection", see OWASP). Exercise names
// and notes are typed by the user, so such cells get a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

export function escapeCsvField(value, { text = true } = {}) {
  let s = value == null ? "" : String(value)
  if (text && FORMULA_START.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// A number cell: finite numbers as they are (dot as decimal separator),
// anything else empty.
function numberField(value) {
  if (value === "" || value == null) return ""
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : ""
}

function workoutRows(workout) {
  const date = parseLocalDate(workout?.date) ? workout.date : ""
  const common = { date, type: workout?.type || "", note: workout?.note || "" }
  const exercises = (workout?.exercises || []).filter(Boolean)
  if (!exercises.length) return [[common.date, common.type, "", "", "", "", common.note]]
  return exercises.map((ex) => [
    common.date,
    common.type,
    ex.name || "",
    numberField(ex.sets),
    numberField(ex.reps),
    numberField(ex.weight),
    common.note,
  ])
}

// Columns 3–5 (sets, reps, weight) are numbers; the rest is text.
const NUMBER_COLUMNS = new Set([3, 4, 5])

export function workoutsToCsv(workouts) {
  // Oldest first; workouts without a valid date go last, in their original order.
  const sorted = [...(workouts || [])].sort((a, b) => {
    const da = parseLocalDate(a?.date) ? a.date : "￿"
    const db = parseLocalDate(b?.date) ? b.date : "￿"
    return da < db ? -1 : da > db ? 1 : 0
  })
  const lines = [CSV_COLUMNS.join(",")]
  for (const workout of sorted) {
    for (const row of workoutRows(workout)) {
      lines.push(row.map((cell, i) => (NUMBER_COLUMNS.has(i) ? cell : escapeCsvField(cell))).join(","))
    }
  }
  return lines.join("\r\n") + "\r\n"
}

// "workouts-2026-11-02.csv", using the local date.
export function exportFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0")
  return `workouts-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`
}

// The file contents as a Blob. The byte order mark makes Excel read the file
// as UTF-8, so Czech characters in notes show correctly.
export function csvBlob(csv) {
  return new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" })
}
