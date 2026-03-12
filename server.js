// server.js
const path = require('node:path')
const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3000

// ====== MIDDLEWARE ======
app.use(express.json())
app.use(cors())

// ====== USERS (v paměti) ======
const users = []
let nextUserId = 1

function findUserByEmail(email) {
  return users.find((u) => u.email === email)
}

// registrace
app.post('/api/register', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email a heslo jsou povinné',
    })
  }

  if (findUserByEmail(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Uživatel už existuje',
    })
  }

  const user = { id: nextUserId++, email, password } // demo: nehashované
  users.push(user)

  return res.json({
    status: 'success',
    userId: user.id,
    email: user.email,
  })
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

  const user = findUserByEmail(email)

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
})

// debug users
app.get('/api/debug-users', (req, res) => {
  res.json(users.map(({ id, email }) => ({ id, email })))
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
    return res
      .status(401)
      .json({ status: 'error', message: 'Chybí user id' })
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
    return res
      .status(401)
      .json({ status: 'error', message: 'Chybí user id' })
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

// TOD: sem můžeš vrátit svoje PUT/DELETE routes, zůstávají stejné jako dřív

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
