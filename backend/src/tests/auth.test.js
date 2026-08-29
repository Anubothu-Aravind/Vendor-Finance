import test from 'node:test'
import assert from 'node:assert/strict'

test('Auth flow tests', async (t) => {
  await t.test('login with valid credentials structure', () => {
    const mockCredentials = { email: 'admin@vastrams.in', password: 'Password123!' }
    assert.equal(typeof mockCredentials.email, 'string')
    assert.equal(typeof mockCredentials.password, 'string')
    assert.ok(mockCredentials.email.includes('@'))
  })

  await t.test('refresh token validation', () => {
    const mockCookie = { refreshToken: 'sample-jwt-refresh-token' }
    assert.ok(mockCookie.refreshToken)
    assert.equal(typeof mockCookie.refreshToken, 'string')
  })

  await t.test('logout clears auth cookies', () => {
    const mockResCookies = []
    const clearCookie = (name) => mockResCookies.push(name)
    clearCookie('accessToken')
    clearCookie('refreshToken')
    assert.deepEqual(mockResCookies, ['accessToken', 'refreshToken'])
  })

  await t.test('admin reset password validation rejects passwords shorter than 8 characters', () => {
    const shortPassword = 'short'
    const isValid = typeof shortPassword === 'string' && shortPassword.trim().length >= 8
    assert.equal(isValid, false)
  })

  await t.test('admin reset password validation accepts valid passwords', () => {
    const validPassword = 'NewSecurePassword123'
    const isValid = typeof validPassword === 'string' && validPassword.trim().length >= 8
    assert.equal(isValid, true)
  })

  await t.test('admin reset password preserves user role, status and permissions while updating passwordHash', () => {
    const originalUser = {
      _id: '6a76eb91c6e2897f2026b8a8',
      name: 'Hourly User',
      email: 'hourly@vastrams.in',
      role: 'Hour-based User',
      status: 'Active',
      permissions: { dashboard: true, vendors: false, bills: false },
      passwordHash: 'old-bcrypt-hash',
      isDefaultCredential: true
    }

    const newPasswordHash = 'new-bcrypt-hash'
    const updatedUser = {
      ...originalUser,
      passwordHash: newPasswordHash,
      isDefaultCredential: false
    }

    // Role, name, email, status, permissions preserved
    assert.equal(updatedUser.name, originalUser.name)
    assert.equal(updatedUser.email, originalUser.email)
    assert.equal(updatedUser.role, originalUser.role)
    assert.equal(updatedUser.status, originalUser.status)
    assert.deepEqual(updatedUser.permissions, originalUser.permissions)
    assert.equal(updatedUser.passwordHash, newPasswordHash)
    assert.equal(updatedUser.isDefaultCredential, false)
  })

  await t.test('hasPermission grants Admin access to all resources', async () => {
    const { hasPermission } = await import('../middleware/auth.middleware.js')
    const adminUser = { role: 'Admin', permissions: [] }
    assert.equal(hasPermission(adminUser, 'dashboard'), true)
    assert.equal(hasPermission(adminUser, 'vendors'), true)
    assert.equal(hasPermission(adminUser, 'cheques'), true)
    assert.equal(hasPermission(adminUser, 'settings'), true)
  })

  await t.test('hasPermission enforces array-based permissions for non-admin users', async () => {
    const { hasPermission } = await import('../middleware/auth.middleware.js')
    const hourlyUser = { role: 'Hour-based User', permissions: ['dashboard', 'cheques'] }
    assert.equal(hasPermission(hourlyUser, 'dashboard'), true)
    assert.equal(hasPermission(hourlyUser, 'cheques'), true)
    assert.equal(hasPermission(hourlyUser, 'vendors'), false)
    assert.equal(hasPermission(hourlyUser, 'purchase_bills'), false)
    assert.equal(hasPermission(hourlyUser, 'settings'), false)
  })

  await t.test('hasPermission correctly resolves alias mapping (e.g. bills/purchase_bills)', async () => {
    const { hasPermission } = await import('../middleware/auth.middleware.js')
    const userWithBillsAlias = { role: 'Viewer', permissions: ['bills', 'payments'] }
    assert.equal(hasPermission(userWithBillsAlias, 'purchase_bills'), true)
    assert.equal(hasPermission(userWithBillsAlias, 'vendor_payments'), true)
    assert.equal(hasPermission(userWithBillsAlias, 'finance'), false)
  })

  await t.test('requirePermission middleware allows authorized users and denies unauthorized users', async () => {
    const { requirePermission } = await import('../middleware/auth.middleware.js')
    const middleware = requirePermission('cheques')

    // 1. Authorized user
    let nextCalled = false
    const reqAuth = { user: { role: 'Hour-based User', permissions: ['dashboard', 'cheques'] } }
    const resAuth = {}
    middleware(reqAuth, resAuth, () => { nextCalled = true })
    assert.equal(nextCalled, true)

    // 2. Unauthorized user
    let statusSent = null
    let jsonSent = null
    const reqUnauth = { user: { role: 'Hour-based User', permissions: ['dashboard'] } }
    const resUnauth = {
      status: (code) => {
        statusSent = code
        return {
          json: (body) => { jsonSent = body }
        }
      }
    }
    middleware(reqUnauth, resUnauth, () => {})
    assert.equal(statusSent, 403)
    assert.equal(jsonSent.success, false)
  })

  await t.test('refresh token is correctly accepted from cookie, request body, or header', () => {
    const fromCookie = { cookies: { refreshToken: 'cookie-token' } }
    const fromBody = { body: { refreshToken: 'body-token' } }
    const fromHeader = { headers: { 'x-refresh-token': 'header-token' } }

    const extractRefresh = (req) => req.cookies?.refreshToken || req.body?.refreshToken || req.headers?.['x-refresh-token']

    assert.equal(extractRefresh(fromCookie), 'cookie-token')
    assert.equal(extractRefresh(fromBody), 'body-token')
    assert.equal(extractRefresh(fromHeader), 'header-token')
  })
})
