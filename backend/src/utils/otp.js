const crypto = require('crypto')
const OTPVerification = require('../models/OTPVerification')

/**
 * Generates a 6-character alphanumeric uppercase OTP.
 */
function generateOTP() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[crypto.randomInt(0, chars.length)]).join('')
}

/**
 * Creates and stores a new OTP verification record in MongoDB.
 * Deletes any existing OTPs for this email/setupToken first.
 */
async function createOTPVerification(email, setupToken) {
  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

  // Remove existing OTPs for this email and token first
  await OTPVerification.deleteMany({ email: email.toLowerCase(), setupToken })

  const record = new OTPVerification({
    email: email.toLowerCase(),
    otp,
    expiresAt,
    setupToken,
    attempts: 0,
    verified: false
  })

  await record.save()
  return otp
}

/**
 * Verifies a submitted OTP.
 * Max 3 attempts allowed.
 */
async function verifyOTP(email, setupToken, submittedOtp) {
  const record = await OTPVerification.findOne({
    email: email.toLowerCase(),
    setupToken
  })

  if (!record) {
    return { success: false, message: 'OTP expired or not found. Please request a new one.' }
  }

  // Increment attempts
  record.attempts += 1
  await record.save()

  if (record.attempts > 3) {
    await OTPVerification.deleteOne({ _id: record._id })
    return { success: false, message: 'Too many invalid attempts. Please request a new OTP.' }
  }

  // Compare submitted OTP
  const isMatch = record.otp.trim().toUpperCase() === submittedOtp.trim().toUpperCase()

  if (!isMatch) {
    return { success: false, message: `Invalid OTP. ${4 - record.attempts} attempts remaining.` }
  }

  // Mark as verified and extend TTL for step 3 completion (10 minutes)
  record.verified = true
  record.expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await record.save()

  return { success: true, message: 'Email verified successfully.' }
}

module.exports = {
  generateOTP,
  createOTPVerification,
  verifyOTP
}
