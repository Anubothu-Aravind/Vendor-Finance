const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { VALID_PERMISSIONS } = require('../middleware/auth.middleware')

const ACCESS_SECRET = process.env.JWT_SECRET || 'vastrams_access_secret_key'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'vastrams_refresh_secret_key'

const { sendInvitationEmail } = require('../utils/mailer')

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' })
    }

    const initialPassword = password || 'Vastrams@123'
    const passwordHash = await bcrypt.hash(initialPassword, 10)
    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'Viewer',
      status: 'Active',
      isDefaultCredential: !password
    })

    await user.save()

    const SETUP_SECRET = process.env.SETUP_TOKEN_SECRET || 'vastrams_setup_secret_key'
    const setupToken = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        purpose: 'setup'
      },
      SETUP_SECRET,
      { expiresIn: '48h' }
    )

    const clientUrl = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'
    const inviteLink = `${clientUrl}/setup?token=${setupToken}`

    // Send invitation email via SMTP with direct accept link
    const mailResult = await sendInvitationEmail(user.email, user.name, user.role, initialPassword, inviteLink)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      emailSent: Boolean(mailResult),
      inviteLink,
      defaultPassword: !password ? initialPassword : undefined,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'User account is inactive. Contact Administrator.' })
    }

    if (user.isDefaultCredential) {
      const SETUP_SECRET = process.env.SETUP_TOKEN_SECRET || 'vastrams_setup_secret_key'
      const setupToken = jwt.sign(
        {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          purpose: 'setup'
        },
        SETUP_SECRET,
        { expiresIn: '15m' }
      )
      return res.status(200).json({
        success: true,
        requiresSetup: true,
        setupToken
      })
    }

    const tokenPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }

    const accessToken = jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: '24h' })
    const refreshToken = jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: '30d' })

    const isProd = process.env.NODE_ENV === 'production'
    const sameSiteMode = process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax')
    const secureCookie = isProd || sameSiteMode === 'none'

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: sameSiteMode,
      maxAge: 15 * 60 * 1000 // 15 minutes (short-lived)
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: sameSiteMode,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || (user.role === 'Admin' ? VALID_PERMISSIONS : []),
        isDefaultCredential: Boolean(user.isDefaultCredential)
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not found' })
    }

    let decoded
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET)
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' })
    }

    const user = await User.findById(decoded.id)
    if (!user || user.status !== 'Active') {
      return res.status(401).json({ success: false, message: 'User not found or inactive' })
    }

    const tokenPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }

    const accessToken = jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: '24h' })
    const isProd = process.env.NODE_ENV === 'production'
    const sameSiteMode = process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax')
    const secureCookie = isProd || sameSiteMode === 'none'

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: sameSiteMode,
      maxAge: 15 * 60 * 1000 // 15 minutes (short-lived)
    })

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || (user.role === 'Admin' ? VALID_PERMISSIONS : []),
        isDefaultCredential: Boolean(user.isDefaultCredential)
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.logout = async (req, res, next) => {
  try {
    const isProd = process.env.NODE_ENV === 'production'
    const sameSiteMode = process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax')
    const secureCookie = isProd || sameSiteMode === 'none'
    res.clearCookie('accessToken', { httpOnly: true, secure: secureCookie, sameSite: sameSiteMode })
    res.clearCookie('jwt', { httpOnly: true, secure: secureCookie, sameSite: sameSiteMode })
    res.clearCookie('refreshToken', { httpOnly: true, secure: secureCookie, sameSite: sameSiteMode })
    res.status(200).json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

exports.me = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions || (req.user.role === 'Admin' ? VALID_PERMISSIONS : []),
        isDefaultCredential: Boolean(req.user.isDefaultCredential)
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash')
    res.status(200).json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        permissions: u.permissions || (u.role === 'Admin' ? VALID_PERMISSIONS : [])
      }))
    })
  } catch (error) {
    next(error)
  }
}

exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params
    const { role } = req.body
    if (!['Admin', 'Viewer', 'Accountant', 'Full-time Staff', 'Part-time Staff', 'Hour-based User'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' })
    }
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash')
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

exports.updateUserPermissions = async (req, res, next) => {
  try {
    const { id } = req.params
    const { permissions } = req.body

    // 1. Validate target user ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' })
    }

    // 2. Validate permissions array
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Permissions must be an array' })
    }

    // 3. Validate permission identifiers
    const invalidPermissions = permissions.filter(p => !VALID_PERMISSIONS.includes(p))
    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permission identifier(s): ${invalidPermissions.join(', ')}`
      })
    }

    // 4. Find user
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // 5. Update only permissions field
    user.permissions = permissions
    await user.save({ validateModifiedOnly: true })

    res.status(200).json({
      success: true,
      message: 'Permissions updated successfully',
      permissions: user.permissions
    })
  } catch (error) {
    next(error)
  }
}

exports.resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params
    const { password } = req.body

    // 1. Validate target user ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' })
    }

    // 2. Validate new password
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Password is required' })
    }

    if (password.trim().length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      })
    }

    // 3. Find target user
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // 4. Hash new password using standard bcrypt cost factor 10
    const passwordHash = await bcrypt.hash(password.trim(), 10)
    user.passwordHash = passwordHash
    user.isDefaultCredential = false
    await user.save({ validateModifiedOnly: true })

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params
    const adminCount = await User.countDocuments({ role: 'Admin' })
    const targetUser = await User.findById(id)
    if (targetUser && targetUser.role === 'Admin' && adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the last remaining Admin user' })
    }
    await User.findByIdAndDelete(id)
    res.status(200).json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    next(error)
  }
}
