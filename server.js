// server.js
const path = require('node:path')
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

// CORS – v produkci Render + React na stejné doméně, takže to můžeš i vypnout
// ale pro jistotu necháme povolené vše
app.use(cors())


// jednoduché úložiště uživatelů v paměti
const users = []
let nextUserId = 1

function findUserByEmail(email) {
  return users.find((u) => u.email === email)
}

// registrace
app.post('/api/register', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email a heslo jsou povinné' })
  }
  if (findUserByEmail(email)) {
    return res.status(400).json({ status: 'error', message: 'Uživatel už existuje' })
  }

  const user = { id: nextUserId++, email, password } // POZOR: jen na demo, ne v produkci
  users.push(user)

  res.json({ status: 'success', userId: user.id, email: user.email })
})

// login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body
  const user = findUserByEmail(email)
  if (!user || user.password !== password) {
    return res.status(401).json({ status: 'error', message: 'Špatný email nebo heslo' })
  }

  // jednoduchý "token" = userId jako string
  const token = String(user.id)
  res.json({ status: 'success', token, userId: user.id, email: user.email })
})








// "DB" v paměti
const workouts = []

function findWorkout(id) {
  return workouts.find((w) => w.id === Number(id))
}

/* ====== API ROUTES ====== */





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

// přidá cvik k existujícímu tréninku
app.post('/api/workouts/:id/exercises', (req, res) => {
  const { id } = req.params
  const { exercise, sets } = req.body

  const workout = findWorkout(id)
  if (!workout) {
    return res.status(404).json({ status: 'error', message: 'Trénink nenalezen' })
  }
  if (!exercise || !sets) {
    return res.status(400).json({
      status: 'error',
      message: 'exercise a sets jsou povinné',
    })
  }

  const exerciseObj = { name: exercise, sets: Number(sets) }
  workout.exercises.push(exerciseObj)

  console.log(`Přidán cvik k tréninku ${id}:`, exerciseObj)
  res.json({ status: 'success', workout })
})

// update tréninku
app.put('/api/workouts/:id', (req, res) => {
  const workoutId = Number(req.params.id)
  const { date, type, exercises, note } = req.body

  const userId = Number(req.headers['x-user-id'])
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Chybí user id' })
  }

  const index = workouts.findIndex((w) => w.id === workoutId && w.userId === userId)
  if (index === -1) {
    return res.status(404).json({
      status: 'error',
      message: 'Trénink s tímto ID neexistuje',
    })
  }

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Musí být alespoň jeden cvik',
    })
  }

  const normalizedExercises = exercises.map((ex) => ({
    id: ex.id ?? Date.now() + Math.random(),
    name: String(ex.name),
    sets: Number(ex.sets),
    reps: Number(ex.reps),
    weight: Number(ex.weight),
  }))

  const updatedWorkout = {
    ...workouts[index],
    date: date || null,
    type: type || null,
    note:
      note !== undefined && note !== null
        ? note
        : workouts[index].note || '',
    exercises: normalizedExercises,
  }

  workouts[index] = updatedWorkout
  console.log('Upravený trénink:', updatedWorkout)
  res.json(updatedWorkout)
})

// smazat celý trénink
app.delete('/api/workouts/:id', (req, res) => {
  const id = Number(req.params.id)
  const userId = Number(req.headers['x-user-id'])
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Chybí user id' })
  }

  const index = workouts.findIndex((w) => w.id === id && w.userId === userId)
  if (index === -1) {
    return res.status(404).json({ status: 'error', message: 'Trénink nenalezen' })
  }

  workouts.splice(index, 1)
  console.log('Smazán trénink', id)
  res.status(204).end()
})

// smazat konkrétní cvik z tréninku
app.delete('/api/workouts/:id/exercises/:exerciseIndex', (req, res) => {
  const id = Number(req.params.id)
  const exerciseIndex = Number(req.params.exerciseIndex)

  const userId = Number(req.headers['x-user-id'])
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Chybí user id' })
  }

  const workout = findWorkout(id)
  if (!workout) {
    return res.status(404).json({ status: 'error', message: 'Trénink nenalezen' })
  }
  if (exerciseIndex < 0 || exerciseIndex >= workout.exercises.length) {
    return res.status(400).json({ status: 'error', message: 'Cvik nenalezen' })
  }

  workout.exercises.splice(exerciseIndex, 1)
  console.log(`Smazán cvik ${exerciseIndex} z tréninku ${id}`)
  res.json({ status: 'success', workout })
})

/* ====== REACT BUILD ====== */

// cesta k buildu (uprav na 'build', pokud používáš CRA)
const buildPath = path.join(__dirname, 'my-react-app', 'dist')
console.log('Build path:', buildPath)


app.use(express.static(buildPath))

// všechno ostatní pošleme do Reactu
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'))
})

app.listen(port, () => {
  console.log(`Server běží na portu ${port}`)
})
