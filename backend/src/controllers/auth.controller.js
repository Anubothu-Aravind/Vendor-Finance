const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

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
    const sameSiteMode = isProd ? 'strict' : 'lax'

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes (short-lived)
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
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
    const sameSiteMode = isProd ? 'strict' : 'lax'

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes (short-lived)
    })

    res.status(200).json({
      success: true,
      accessToken
    })
  } catch (error) {
    next(error)
  }
}

exports.logout = async (req, res, next) => {
  try {
    const isProd = process.env.NODE_ENV === 'production'
    const sameSiteMode = isProd ? 'strict' : 'lax'
    res.clearCookie('accessToken', { httpOnly: true, secure: isProd, sameSite: sameSiteMode })
    res.clearCookie('jwt', { httpOnly: true, secure: isProd, sameSite: typeof isProd !== 'undefined' && isProd ? 'strict' : 'lax' })
    res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: sameSiteMode })
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
        status: u.status
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
    if (!['Admin', 'Viewer'].includes(role)) {
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
