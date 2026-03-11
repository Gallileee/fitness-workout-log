// server.js
const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')

const app = express()
const port = process.env.PORT || 3000

// ====== DB (SQLite) ======
const dbPath = path.join(__dirname, 'db.sqlite')
const db = new Database(dbPath)

// tabulka users
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`).run()

// ====== MIDDLEWARE ======
app.use(express.json())
app.use(cors())

// ====== AUTH ROUTES ======

// registrace
app.post('/api/register', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email a heslo jsou povinné',
    })
  }

  try {
    const insert = db.prepare(`
      INSERT INTO users (email, password)
      VALUES (?, ?)
    `)
    const result = insert.run(email, password) // jen demo, nehashujeme

    return res.json({
      status: 'success',
      userId: result.lastInsertRowid,
      email,
    })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({
        status: 'error',
        message: 'Uživatel už existuje',
      })
    }
    console.error('Chyba při registraci:', err)
    return res.status(500).json({
      status: 'error',
      message: 'Server error při registraci',
    })
  }
})

// login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email a heslo jsou povinné',
    })
  }

  try {
    const select = db.prepare(`
      SELECT id, email, password
      FROM users
      WHERE email = ?
    `)
    const user = select.get(email)

    if (!user || user.password !== password) {
      return res.status(401).json({
        status: 'error',
        message: 'Špatný email nebo heslo',
      })
    }

    const token = String(user.id)

    return res.json({
      status: 'success',
      token,
      userId: user.id,
      email: user.email,
    })
  } catch (err) {
    console.error('Chyba při loginu:', err)
    return res.status(500).json({
      status: 'error',
      message: 'Server error při přihlášení',
    })
  }
})

// debug users
app.get('/api/debug-users', (req, res) => {
  const rows = db.prepare('SELECT id, email FROM users').all()
  res.json(rows)
})

// ====== WORKOUTS (v paměti) ======
const workouts = []

function findWorkout(id) {
  return workouts.find((w) => w.id === Number(id))
}

// vrátí všechny tréninky
app.get('/api/workouts', (req, res) => {
  const userId = Number(req.headers['x-user-id'])
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Chybí user id' })
  }
  const userWorkouts = workouts.filter((w) => w.userId === userId)
  res.json(userWorkouts)
})

// vytvoří nový trénink
app.post('/api/workouts', (req, res) => {
  const { date, type, exercises, note } = req.body

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Musí být alespoň jeden cvik v poli exercises',
    })
  }

  const userId = Number(req.headers['x-user-id'])
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Chybí user id' })
  }

  const normalizedExercises = exercises.map((ex) => ({
    id: ex.id ?? Date.now() + Math.random(),
    name: String(ex.name),
    sets: Number(ex.sets),
    reps: Number(ex.reps),
    weight: Number(ex.weight),
  }))

  const workout = {
    id: workouts.length + 1,
    userId,
    date: date || null,
    type: type || null,
    note: note || '',
    exercises: normalizedExercises,
  }

  workouts.push(workout)
  console.log('Nový trénink:', workout)
  res.json(workout)
})

// ... (další workout routes nech stejné)


// ====== REACT BUILD ======
const buildPath = path.join(__dirname, 'my-react-app', 'dist')
console.log('Build path:', buildPath)

app.use(express.static(buildPath))

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'))
})

app.listen(port, () => {
  console.log(`Server běží na portu ${port}`)
})
