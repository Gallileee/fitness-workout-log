// server.js
// Serves the production build of the React app (my-react-app/dist).
// Auth and data live in Supabase and are called directly from the browser,
// so this server has no API of its own.
const fs = require('node:fs')
const path = require('node:path')
const express = require('express')

const DEFAULT_BUILD_PATH = path.join(__dirname, 'my-react-app', 'dist')

function createApp({ buildPath = DEFAULT_BUILD_PATH } = {}) {
  const indexFile = path.join(buildPath, 'index.html')
  if (!fs.existsSync(indexFile)) {
    throw new Error(`${indexFile} not found. Build the frontend first: npm run build`)
  }

  const app = express()
  app.disable('x-powered-by')

  // Vite puts content hashes into asset file names, so they can be cached for a long time.
  app.use('/assets', express.static(path.join(buildPath, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(buildPath))

  // The old in-memory API was removed; answer clearly instead of with index.html.
  app.use('/api', (req, res) => {
    res.status(404).json({ status: 'error', message: 'Not found' })
  })

  // Single-page app: every other GET returns index.html and React renders the page.
  app.get(/.*/, (req, res) => {
    res.sendFile(indexFile)
  })

  return app
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000
  let app
  try {
    app = createApp()
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
  app.listen(port, () => {
    console.log(`Serving the app on http://localhost:${port}`)
  })
}

module.exports = { createApp }
