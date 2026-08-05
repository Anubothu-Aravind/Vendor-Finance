/**
 * Audit Middleware
 *
 * Factory that wraps a route's response and writes a structured JSON audit
 * entry to the console after the response is sent.
 *
 * Current output: console.info (structured JSON, compatible with log aggregators)
 * Future: swap the console.info line for AuditLog.create(entry) to persist
 *         to MongoDB without changing any controller or route code.
 *
 * Usage:
 *   const audit = require('../middleware/audit.middleware')
 *   router.post('/profile', audit('profile'), settingsController.updateProfile)
 *
 * @param {string} entityType  Human-readable entity label (e.g. 'profile', 'logo')
 */
module.exports = function audit(entityType) {
  return function auditMiddleware(req, res, next) {
    const startedAt = Date.now()

    // Intercept res.json so we can read the status code after the handler runs
    const originalJson = res.json.bind(res)
    res.json = function(body) {
      // Only log on mutating methods (safety guard — routes already enforce this)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const entry = {
          requestId:   req.requestId || '—',
          entityType,
          method:      req.method,
          path:        req.originalUrl || req.path,
          userId:      req.user?._id?.toString() || 'anonymous',
          userName:    req.user?.name || 'anonymous',
          ip:          req.ip || req.socket?.remoteAddress || '—',
          userAgent:   req.headers['user-agent'] || '—',
          statusCode:  res.statusCode,
          durationMs:  Date.now() - startedAt,
          timestamp:   new Date().toISOString(),
          // Future: include diff of changed fields (before/after)
        }

        console.info('[audit]', JSON.stringify(entry))
        // Future Phase 2: AuditLog.create(entry).catch(err => console.warn('[audit] DB write failed:', err.message))
      }

      return originalJson(body)
    }

    next()
  }
}
