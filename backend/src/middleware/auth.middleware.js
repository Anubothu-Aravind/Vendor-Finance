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

const VALID_PERMISSIONS = [
  'dashboard',
  'vendors',
  'purchase_bills',
  'finance',
  'loans',
  'financial_repayments',
  'vendor_payments',
  'cheques',
  'outstanding',
  'ledger',
  'transactions',
  'reports',
  'settings'
]

function hasPermission(user, permission) {
  if (!user) return false
  if (user.role === 'Admin') return true
  if (!permission) return true

  const perms = user.permissions
  if (!perms) return false

  if (Array.isArray(perms)) {
    if (perms.includes(permission)) return true
    if (permission === 'purchase_bills' && perms.includes('bills')) return true
    if (permission === 'vendor_payments' && perms.includes('payments')) return true
    if (permission === 'financial_repayments' && (perms.includes('financier-payments') || perms.includes('finance'))) return true
    if (permission === 'transactions' && (perms.includes('transaction-history') || perms.includes('ledger'))) return true
    if (permission === 'outstanding' && (perms.includes('ledger') || perms.includes('reports'))) return true
    return false
  }

  if (typeof perms === 'object') {
    if (perms[permission]) return true
    if (permission === 'purchase_bills' && perms.bills) return true
    if (permission === 'vendor_payments' && perms.payments) return true
    if (permission === 'financial_repayments' && (perms.finance || perms['financier-payments'])) return true
    if (permission === 'transactions' && (perms.ledger || perms['transaction-history'])) return true
    if (permission === 'outstanding' && (perms.ledger || perms.reports)) return true
    return false
  }

  return false
}

exports.requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    if (req.user.role === 'Admin') {
      return next()
    }

    const permissions = Array.isArray(permission) ? permission : [permission]
    const authorized = permissions.some(p => hasPermission(req.user, p))

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires permission: ${permissions.join(' or ')}`
      })
    }

    next()
  }
}

exports.hasPermission = hasPermission
exports.VALID_PERMISSIONS = VALID_PERMISSIONS

