const { randomUUID } = require('crypto')

/**
 * Request ID Middleware
 *
 * Injects a unique request ID into every inbound request and echoes it
 * in the response header. Downstream middleware and controllers access it
 * via `req.requestId`.
 *
 * If the client sends an `x-request-id` header (e.g. from a mobile app or
 * another service), that value is used as-is. This allows end-to-end
 * correlation across service boundaries.
 *
 * Apply this middleware globally before all routes:
 *   app.use(require('./middleware/requestId.middleware'))
 */
module.exports = function requestId(req, res, next) {
  req.requestId = req.headers['x-request-id'] || randomUUID()
  res.setHeader('x-request-id', req.requestId)
  next()
}
