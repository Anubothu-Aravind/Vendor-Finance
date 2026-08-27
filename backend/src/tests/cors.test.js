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
})

