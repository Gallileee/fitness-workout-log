// server/server.js
const path = require('node:path')
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cors())

// "DB" v paměti
const workouts = []

function findWorkout(id) {
  return workouts.find((w) => w.id === Number(id))
}

/* ===== API ROUTES ===== */

// vrátí všechny tréninky
app.get('/api/workouts', (req, res) => {
  res.json(workouts)
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

  const normalizedExercises = exercises.map((ex) => ({
    id: ex.id ?? Date.now() + Math.random(),
    name: String(ex.name),
    sets: Number(ex.sets),
    reps: Number(ex.reps),
    weight: Number(ex.weight),
  }))

  const workout = {
    id: workouts.length + 1,
    date: date || null,
    type: type || null,
    note: note || '',
    exercises: normalizedExercises,
  }

  workouts.push(workout)
  console.log('Nový trénink:', workout)
  res.json(workout)
})

// přidání cviku, update, delete – nechávám stejné jako máš teď...
// (přenes si sem svoje /api/workouts/:id/exercises, PUT, DELETE atd.)

/* ===== REACT BUILD ===== */

// absolutní cesta k buildu z my-react-app/dist
const buildPath = path.join(__dirname, '..', 'my-react-app', 'dist')

app.use(express.static(buildPath))

// všechny ostatní cesty poslat do Reactu
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'))
})

app.listen(port, () => {
  console.log(`Server běží na portu ${port}`)
})
