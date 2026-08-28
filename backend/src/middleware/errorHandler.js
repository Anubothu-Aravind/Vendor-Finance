/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors || {}).map(e => e.message).join(', ') || err.message
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid format for ${err.path || 'identifier'}`
  }

  // Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 400
    const fields = Object.keys(err.keyValue || {}).join(', ')
    message = `${fields || 'Field'} already exists.`
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
}

module.exports = errorHandler
