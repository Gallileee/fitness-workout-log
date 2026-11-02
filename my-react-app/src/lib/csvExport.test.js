import { test, describe } from "vitest"
import assert from "node:assert/strict"
import { CSV_COLUMNS, escapeCsvField, workoutsToCsv, exportFileName, csvBlob } from "./csvExport.js"

const lines = (csv) => csv.split("\r\n").slice(0, -1)

describe("escapeCsvField", () => {
  test("leaves plain values alone and empties null", () => {
    assert.equal(escapeCsvField("Bench Press"), "Bench Press")
    assert.equal(escapeCsvField(null), "")
    assert.equal(escapeCsvField(undefined), "")
  })

  test("quotes commas, quotes and line breaks (RFC 4180)", () => {
    assert.equal(escapeCsvField("a, b"), '"a, b"')
    assert.equal(escapeCsvField('the "good" set'), '"the ""good"" set"')
    assert.equal(escapeCsvField("line 1\nline 2"), '"line 1\nline 2"')
    assert.equal(escapeCsvField("x\r\ny"), '"x\r\ny"')
  })

  test("neutralises cells a spreadsheet would run as formulas", () => {
    assert.equal(escapeCsvField("=HYPERLINK(\"http://x\")"), '"\'=HYPERLINK(""http://x"")"')
    assert.equal(escapeCsvField("+1"), "'+1")
    assert.equal(escapeCsvField("-felt bad"), "'-felt bad")
    assert.equal(escapeCsvField("@SUM(A1)"), "'@SUM(A1)")
    assert.equal(escapeCsvField("\tx"), "'\tx")
    assert.equal(escapeCsvField("ok = fine"), "ok = fine")
  })

  test("number cells are not prefixed", () => {
    assert.equal(escapeCsvField("-5", { text: false }), "-5")
  })
})

describe("workoutsToCsv", () => {
  test("only the header for no workouts", () => {
    assert.equal(workoutsToCsv([]), CSV_COLUMNS.join(",") + "\r\n")
    assert.equal(workoutsToCsv(undefined), CSV_COLUMNS.join(",") + "\r\n")
  })

  test("one row per exercise, oldest workout first, weight in kg", () => {
    const csv = workoutsToCsv([
      {
        date: "2026-10-31",
        type: "push",
        note: "Těžké, ale dobré",
        exercises: [
          { name: "Bench Press", sets: 4, reps: 6, weight: 87.5 },
          { name: "Dips", sets: 3, reps: 10, weight: 0 },
        ],
      },
      { date: "2026-10-27", type: "pull", note: "", exercises: [{ name: "Pull-up", sets: "3", reps: "8", weight: "" }] },
    ])
    assert.deepEqual(lines(csv), [
      "date,workout_type,exercise,sets,reps,weight_kg,note",
      "2026-10-27,pull,Pull-up,3,8,,",
      "2026-10-31,push,Bench Press,4,6,87.5,\"Těžké, ale dobré\"",
      "2026-10-31,push,Dips,3,10,0,\"Těžké, ale dobré\"",
    ])
  })

  test("keeps a workout without exercises as one row", () => {
    assert.deepEqual(lines(workoutsToCsv([{ date: "2026-10-01", type: "core", note: "Jen strečink", exercises: [] }])), [
      CSV_COLUMNS.join(","),
      "2026-10-01,core,,,,,Jen strečink",
    ])
  })

  test("invalid dates and numbers become empty cells, undated workouts go last", () => {
    const csv = workoutsToCsv([
      { date: "not a date", type: "legs", exercises: [{ name: "Squat", sets: "x", reps: 5, weight: Infinity }] },
      { date: "2026-10-02", type: null, exercises: [null, { name: "Plank" }] },
    ])
    assert.deepEqual(lines(csv).slice(1), ["2026-10-02,,Plank,,,,", ",legs,Squat,,5,,"])
  })

  test("user-typed formulas in names and notes are neutralised", () => {
    const csv = workoutsToCsv([
      { date: "2026-10-03", type: "other", note: "=1+1", exercises: [{ name: "@evil", sets: 1, reps: 1, weight: 10 }] },
    ])
    assert.equal(lines(csv)[1], "2026-10-03,other,'@evil,1,1,10,'=1+1")
  })
})

describe("exportFileName and csvBlob", () => {
  test("names the file by the local date", () => {
    assert.equal(exportFileName(new Date(2026, 10, 2, 23, 59)), "workouts-2026-11-02.csv")
    assert.equal(exportFileName(new Date(2026, 0, 5)), "workouts-2026-01-05.csv")
  })

  test("the blob is UTF-8 CSV with a byte order mark", async () => {
    const blob = csvBlob("a\r\n")
    assert.equal(blob.type, "text/csv;charset=utf-8")
    const bytes = new Uint8Array(await blob.arrayBuffer())
    assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf])
  })
})
