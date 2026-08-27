const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../../models/User')
const OTPVerification = require('../../models/OTPVerification')
const { createOTPVerification, verifyOTP } = require('../../utils/otp')
const { sendOTPEmail } = require('../../utils/mailer')

const SETUP_SECRET = process.env.SETUP_TOKEN_SECRET || 'vastrams_setup_secret_key'
const ACCESS_SECRET = process.env.JWT_SECRET || 'vastrams_access_secret_key'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'vastrams_refresh_secret_key'

// Middleware to authenticate setup token
const authenticateSetupToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Setup token missing or invalid' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, SETUP_SECRET)
    if (decoded.purpose !== 'setup') {
      return res.status(401).json({ success: false, message: 'Invalid token purpose' })
    }
    req.setupUser = decoded
    req.rawSetupToken = token
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Setup token expired or invalid' })
  }
}

// 1. POST /api/auth/setup/send-otp
router.post('/send-otp', authenticateSetupToken, async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    // Check if another active user is already using this email
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser && existingUser._id.toString() !== req.setupUser.id) {
      return res.status(400).json({ success: false, message: 'This email is already in use by another account' })
    }

    const otp = await createOTPVerification(email, req.rawSetupToken)
    await sendOTPEmail(email.toLowerCase(), otp)

    res.status(200).json({ success: true, message: `Verification OTP sent to ${email}` })
  } catch (error) {
    next(error)
  }
})

// 2. POST /api/auth/setup/verify-otp
router.post('/verify-otp', authenticateSetupToken, async (req, res, next) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' })
    }

    const result = await verifyOTP(email, req.rawSetupToken, otp)
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message })
    }

    res.status(200).json({ success: true, message: result.message })
  } catch (error) {
    next(error)
  }
})

// 3. POST /api/auth/setup/complete
router.post('/complete', authenticateSetupToken, async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'New email and password are required' })
    }

    // Validate password constraints
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long, contain at least 1 uppercase letter, 1 number, and 1 special character.'
      })
    }

    // Check if another active user is already using this email
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser && existingUser._id.toString() !== req.setupUser.id) {
      return res.status(400).json({ success: false, message: 'This email is already in use by another account' })
    }

    // Verify email was indeed OTP-verified for this setup token
    const otpRecord = await OTPVerification.findOne({
      email: email.toLowerCase(),
      setupToken: req.rawSetupToken,
      verified: true
    })

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Email address has not been verified yet.' })
    }

    // Update user record
    const user = await User.findById(req.setupUser.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    user.email = email.toLowerCase()
    user.passwordHash = passwordHash
    user.isDefaultCredential = false
    await user.save()

    // Delete verification OTP records
    await OTPVerification.deleteMany({ setupToken: req.rawSetupToken })

    // Issue normal tokens
    const tokenPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }

    const accessToken = jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: '1h' })
    const refreshToken = jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: '7d' })

    const isProd = process.env.NODE_ENV === 'production'
    const sameSiteMode = isProd ? 'strict' : 'lax'

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      maxAge: 15 * 60 * 1000 // 15 minutes
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.status(200).json({
      success: true,
      message: 'Account setup completed successfully',
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
})

// 4. POST /api/auth/setup/skip
router.post('/skip', authenticateSetupToken, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Setup bypass is not allowed in production mode.' })
    }

    const user = await User.findById(req.setupUser.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Clean up any remaining verification records
    await OTPVerification.deleteMany({ setupToken: req.rawSetupToken })

    // Mark setup complete in DB for returning user logins
    user.isDefaultCredential = false
    await user.save()

    // Issue normal tokens directly without credentials changes (setup is bypassed for current session only)
    const tokenPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      setupBypassed: true
    }

    const accessToken = jwt.sign(tokenPayload, ACCESS_SECRET, { expiresIn: '1h' })
    const refreshToken = jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: '7d' })

    const isProd = process.env.NODE_ENV === 'production'
    const sameSiteMode = isProd ? 'strict' : 'lax'

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      maxAge: 15 * 60 * 1000
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.status(200).json({
      success: true,
      message: 'Dev mode: Account setup bypassed.',
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
})

// 5. GET /api/auth/setup/status
router.get('/status', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ success: true, isComplete: false })
    }
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, SETUP_SECRET)
      const user = await User.findById(decoded.id)
      if (!user || user.isDefaultCredential) {
        return res.status(200).json({ success: true, isComplete: false })
      }
      return res.status(200).json({ success: true, isComplete: true })
    } catch {
      return res.status(200).json({ success: true, isComplete: false })
    }
  } catch (error) {
    next(error)
  }
})

module.exports = router
