const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

const ACCESS_SECRET = process.env.JWT_SECRET || 'vastrams_access_secret_key'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'vastrams_refresh_secret_key'

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'Viewer',
      status: 'Active'
    })

    await user.save()

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
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

    const user = await User.findOne({ email: email.toLowerCase() })
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

    const accessToken = jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: '1h' })
    const refreshToken = jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: '7d' })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        name: user.name,
        email: user.email,
        role: user.role
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

    const accessToken = jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: '1h' })

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
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
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
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    })
  } catch (error) {
    next(error)
  }
}
