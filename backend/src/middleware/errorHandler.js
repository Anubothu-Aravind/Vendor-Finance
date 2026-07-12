/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  console.error('\x1b[31m%s\x1b[0m', `[Error Handler] ${err.stack || err.message}`)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
}

module.exports = errorHandler
