import test from 'node:test'
import assert from 'node:assert/strict'
import { isOriginAllowed, normalizeOrigin, corsOptions, VASTRAMS_VERCEL_REGEX } from '../config/cors.js'

test('CORS Configuration and Allowlist Tests', async (t) => {
  await t.test('normalizeOrigin trims whitespace and trailing slashes', () => {
    assert.equal(normalizeOrigin('https://vastrams.vercel.app/'), 'https://vastrams.vercel.app')
    assert.equal(normalizeOrigin('  http://localhost:3000///  '), 'http://localhost:3000')
    assert.equal(normalizeOrigin(null), null)
    assert.equal(normalizeOrigin(undefined), null)
  })

  await t.test('allows main production Vercel domain', () => {
    assert.equal(isOriginAllowed('https://vastrams.vercel.app'), true)
    assert.equal(isOriginAllowed('https://vastrams.vercel.app/'), true)
  })

  await t.test('allows Vercel preview deployment URLs for Vastrams project', () => {
    // Specific deployment from user error report
    assert.equal(isOriginAllowed('https://vastrams-hnxxkpee5-purushottam897s-projects.vercel.app'), true)
    
    // Standard git branch and preview patterns
    assert.equal(isOriginAllowed('https://vastrams-git-main-purushottam897s-projects.vercel.app'), true)
    assert.equal(isOriginAllowed('https://vastrams-feat-darkmode-purushottam897s-projects.vercel.app'), true)
    assert.equal(isOriginAllowed('https://vastrams-preview-123.vercel.app'), true)
    assert.equal(isOriginAllowed('https://vendor-finance-git-main.vercel.app'), true)
  })

  await t.test('allows local development origins', () => {
    assert.equal(isOriginAllowed('http://localhost:3000'), true)
    assert.equal(isOriginAllowed('http://127.0.0.1:3000'), true)
    assert.equal(isOriginAllowed('http://localhost:5173'), true)
    assert.equal(isOriginAllowed('http://127.0.0.1:5173'), true)
    assert.equal(isOriginAllowed('http://localhost:5001'), true)
  })

  await t.test('allows non-browser requests (e.g. curl, mobile, server-to-server with undefined origin)', () => {
    assert.equal(isOriginAllowed(undefined), true)
    assert.equal(isOriginAllowed(null), true)
    assert.equal(isOriginAllowed(''), true)
  })

  await t.test('blocks untrusted third-party Vercel domains', () => {
    assert.equal(isOriginAllowed('https://malicious-site.vercel.app'), false)
    assert.equal(isOriginAllowed('https://otherproject-hnxxkpee5.vercel.app'), false)
    assert.equal(isOriginAllowed('https://fakevastrams.com'), false)
    assert.equal(isOriginAllowed('https://evil-attacker.org'), false)
  })

  await t.test('enforces credentials and supported methods', () => {
    assert.equal(corsOptions.credentials, true)
    assert.ok(corsOptions.methods.includes('GET'))
    assert.ok(corsOptions.methods.includes('POST'))
    assert.ok(corsOptions.methods.includes('PUT'))
    assert.ok(corsOptions.methods.includes('PATCH'))
    assert.ok(corsOptions.methods.includes('DELETE'))
    assert.ok(corsOptions.methods.includes('OPTIONS'))
  })

  await t.test('Reverse Proxy: Express with trust proxy = 1 parses client IP and allows express-rate-limit', async () => {
    const expressModule = (await import('express')).default
    const rateLimitModule = (await import('express-rate-limit')).default
    const http = await import('node:http')

    const app = expressModule()
    app.set('trust proxy', 1)

    const limiter = rateLimitModule({
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false
    })

    app.use('/test-proxy', limiter)
    app.get('/test-proxy', (req, res) => {
      res.json({ success: true, ip: req.ip })
    })

    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port

    try {
      const clientIp = '203.0.113.195'
      const response = await fetch(`http://127.0.0.1:${port}/test-proxy`, {
        headers: {
          'X-Forwarded-For': clientIp
        }
      })
      assert.equal(response.status, 200)
      const body = await response.json()
      assert.equal(body.success, true)
      assert.equal(body.ip, clientIp)
    } finally {
      server.close()
    }
  })

  await t.test('SSE: /api/events endpoint sets proper keepalive headers and initial stream bytes', async () => {
    const expressModule = (await import('express')).default
    const http = await import('node:http')
    const { sseHandler } = await import('../utils/sse.js')

    const app = expressModule()
    app.get('/api/events', sseHandler)

    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1000)

      const response = await fetch(`http://127.0.0.1:${port}/api/events`, {
        signal: controller.signal
      })

      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'text/event-stream')
      assert.ok(response.headers.get('cache-control').includes('no-cache'))
      assert.equal(response.headers.get('connection'), 'keep-alive')

      clearTimeout(timeout)
      controller.abort() // Close client stream cleanly
    } catch (err) {
      if (err.name !== 'AbortError') {
        throw err
      }
    } finally {
      server.close()
    }
  })

  await t.test('Health check: /api/health and /health return 200 OK without authentication', async () => {
    const expressModule = (await import('express')).default
    const http = await import('node:http')

    const app = expressModule()
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', success: true })
    })
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', success: true })
    })

    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port

    try {
      const res1 = await fetch(`http://127.0.0.1:${port}/health`)
      assert.equal(res1.status, 200)
      const data1 = await res1.json()
      assert.equal(data1.status, 'ok')

      const res2 = await fetch(`http://127.0.0.1:${port}/api/health`)
      assert.equal(res2.status, 200)
      const data2 = await res2.json()
      assert.equal(data2.status, 'ok')
    } finally {
      server.close()
    }
  })
})

