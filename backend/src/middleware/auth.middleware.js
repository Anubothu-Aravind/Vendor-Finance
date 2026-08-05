const passport = require('passport')

exports.authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err)
    if (!user) {
      const msg = info?.message || 'Authentication token missing or invalid'
      return res.status(401).json({ success: false, message: msg })
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact Administrator.' })
    }
    req.user = user
    next()
  })(req, res, next)
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
