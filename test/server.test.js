// Run with: npm test  (from the repository root)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createApp } = require('../server.js')

const INDEX_HTML = '<!doctype html><title>Fitness tracker</title><div id="root"></div>'

// Starts the server once, on a fake build folder, so the tests don't depend on
// running `vite build`. A shared promise instead of a before() hook: Node 18.12
// doesn't wait for async hooks before running the tests.
const serverUrl = (() => {
  const buildPath = fs.mkdtempSync(path.join(os.tmpdir(), 'fitness-build-'))
  fs.mkdirSync(path.join(buildPath, 'assets'))
  fs.writeFileSync(path.join(buildPath, 'index.html'), INDEX_HTML)
  fs.writeFileSync(path.join(buildPath, 'assets', 'index-abc123.js'), 'console.log("app")')
  fs.writeFileSync(path.join(buildPath, 'vite.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')

  const server = createApp({ buildPath }).listen(0, '127.0.0.1')
  server.unref() // let the process exit when the tests are done
  process.on('exit', () => fs.rmSync(buildPath, { recursive: true, force: true }))

  return new Promise((resolve) => {
    server.once('listening', () => resolve(`http://127.0.0.1:${server.address().port}`))
  })
})()

async function get(urlPath, options) {
  return fetch((await serverUrl) + urlPath, options)
}

// --- static files ---

test('serves index.html at /', async () => {
  const res = await get('/')
  assert.equal(res.status, 200)
  assert.equal(await res.text(), INDEX_HTML)
})

test('serves hashed assets with a long cache lifetime', async () => {
  const res = await get('/assets/index-abc123.js')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /javascript/)
  assert.match(res.headers.get('cache-control'), /max-age=31536000.*immutable/)
})

test('serves other files from the build folder', async () => {
  const res = await get('/vite.svg')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /svg/)
})

test('does not advertise Express', async () => {
  const res = await get('/')
  assert.equal(res.headers.get('x-powered-by'), null)
})

// --- single-page app fallback ---

test('unknown paths return index.html', async () => {
  for (const p of ['/dashboard', '/workouts/42/edit']) {
    const res = await get(p)
    assert.equal(res.status, 200, p)
    assert.equal(await res.text(), INDEX_HTML, p)
  }
})

test('paths outside the build folder are not served', async () => {
  const res = await get('/..%2f..%2fpackage.json')
  const packageJson = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  assert.notEqual(await res.text(), packageJson)
})

// --- the removed in-memory API ---

const oldRoutes = [
  ['POST', '/api/register'],
  ['POST', '/api/login'],
  ['GET', '/api/debug-users'],
  ['GET', '/api/workouts'],
  ['POST', '/api/workouts'],
]

for (const [method, route] of oldRoutes) {
  test(`${method} ${route} returns a JSON 404`, async () => {
    const res = await get(route, {
      method,
      headers: { 'content-type': 'application/json', 'x-user-id': '1' },
      body: method === 'POST' ? JSON.stringify({ email: 'a@example.com', password: 'x' }) : undefined,
    })
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { status: 'error', message: 'Not found' })
  })
}

// --- startup ---

test('createApp fails clearly when the frontend is not built', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'fitness-empty-'))
  try {
    assert.throws(() => createApp({ buildPath: empty }), /index\.html not found.*npm run build/)
  } finally {
    fs.rmSync(empty, { recursive: true, force: true })
  }
})
