const jwt = require('jsonwebtoken')
const User = require('../models/User')

const ACCESS_SECRET = process.env.JWT_SECRET || 'vastrams_access_secret_key'

exports.authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication token missing or invalid' })
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, ACCESS_SECRET)
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token expired or signature invalid' })
    }

    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ success: false, message: 'User matching this token no longer exists' })
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact Administrator.' })
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Access denied. Requires role: ${roles.join(' or ')}` })
    }

    next()
  }
}
