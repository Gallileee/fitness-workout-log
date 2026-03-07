const express = require('express')
const app = express()
const port = 3000



const Ajv = require("ajv")
const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}

const schema = {
  type: "object",
  properties: {
    name: {type: "string"},
    desc: {type: "string"}
  },
  required: ["name"],
  additionalProperties: false
}





app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.get('/api/data', (req, res) => {
  const data = {
    message: 'Hello from the server!',
    timestamp: new Date()
  }
  res.json(data)
})
const validate = ajv.compile(schema)   

app.post('/api/data', (req, res) => {
  let body = ''
  req.on('data', chunk => {
    body += chunk.toString()
  })
  req.on('end', () => {
    console.log('Received data:', body)
    res.json({ status: 'success', received: body })
  })
  if (req.headers['content-type'] === 'application/json') {
    let jsonData = ''
    req.on('data', chunk => {
      jsonData += chunk.toString()
    })
    req.on('end', () => {
      try {
        const parsedData = JSON.parse(jsonData)
        console.log('Received JSON data:', parsedData)
        res.json({ status: 'success', received: parsedData })
      } catch (error) {
        console.error('Error parsing JSON:', error)
        res.status(400).json({ status: 'error', message: 'Invalid JSON' })
      }
    })
  }
})

app.post('/api/data', (req, res) => {
  const data = req.body
  console.log('Dostal jsem z klienta:', data)
  res.json({ status: 'success', received: data })
})

